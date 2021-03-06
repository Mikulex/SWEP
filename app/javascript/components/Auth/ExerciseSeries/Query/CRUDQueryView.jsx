import React, { useContext } from "react";
import {
    Loader,
    Tab,
    Button,
    Grid,
    Message,
    Table
} from "semantic-ui-react";

import {Controlled as CodeMirror} from "react-codemirror2";
require('codemirror/mode/sql/sql');

import AuthedContext from '../../AuthedContext.jsx';
import API from '../../../API/API.jsx';
import QueryResponseTable from '../../Components/QueryResponseTable.jsx';

const CRUDQueryView = (props) => {
    const context = useContext(AuthedContext);

    return <CRUDQueryViewComponent context={context} exerciseId={props.exerciseId} {...props} />
}

class CRUDQueryViewComponent extends React.Component {

    constructor(props) {
        super(props);

        this.addQueryButton = { menuItem: "Query Hinzufügen", render: () => {
            let queryCount = this.state.queryPanes.length;
            if (queryCount > 0) {   // There can be at most one untracked query
                return <label>Bitte erst Query {queryCount} abschicken.</label>
            } else {    // There's no query so far, so we don't show to submit the untracked query
                return null;
            }
        }};

        this.state = {
            initialized: false,
            queryPanes: [],
            codeMirrorOptions: {
                lineNumbers: true,
                mode: "sql"
            },
            queryPanes: [],
            localQueryMap: new Map(),
            activeIndex: 0,
            exerciseId: props.exerciseId,
            messageTitle: "",
            messageContent: "",
            successMessage: true,
            warningMessage: false,
            showMessage: false,
            loading: false,
            context: props.context
        }
    }

    async componentDidMount() {
        setTimeout(async () => {  // Timeout to ensure showing circle
            for (const queryId of this.state.context.getExerciseById(this.props.exerciseId).queryIdSet) {
                if (this.state.context.getQuery(queryId)) {
                    this.state.localQueryMap.set(queryId, this.state.context.getQuery(queryId));
                } else {
                    // Fetch query, put in context and local
                    let queryPromiseResult = await API.getQuery(queryId);
                    let queryResult = queryPromiseResult.data;
                    
                    this.state.localQueryMap.set(queryResult.id, queryResult.query);
                    this.state.context.addQuery(queryResult.id, queryResult.query);
                }
            }
            this.updatePanes();
            this.setState({
                initialized: true
            });
        }, 50);
    }

    handleTabChange = (event, data) => {
        let newActiveIndex = data.activeIndex;
        if (newActiveIndex == this.state.queryPanes.length && !this.state.localQueryMap.has(Number.MAX_SAFE_INTEGER)) {
            // Clicked last element
            // and there's no untracked element at the moment
            this.state.localQueryMap.set(Number.MAX_SAFE_INTEGER, "INSERT INTO Here VALUES('QUERY')");
            this.updatePanes();
        }
        this.setState({
            activeIndex: data.activeIndex,
            showMessage: false
        });
    }

    updatePanes = () => {
        let panes = [];
        let i = 1;
        let sortedByIdQueries = new Map([...this.state.localQueryMap.entries()].sort(intComparator));
        for (const [queryId, value] of sortedByIdQueries) {
            panes.push({
                menuItem: "Query " + i,
                render: () => {
                    return (
                    <Tab.Pane key={queryId}>
                        <CodeMirror
                            value={ this.state.localQueryMap.get(queryId) }
                            options={ this.state.codeMirrorOptions }
                            onBeforeChange={ (editor, data, value) => {
                                this.updateLocalQuery(queryId, value);
                            }}/>
                        { this.state.showMessage ? (this.state.successMessage || this.state.warningMessage ) ? 
                            <React.Fragment>
                                <Message
                                    color={ this.state.warningMessage ? 'yellow' : null /* Due to some bug in react 'warning' doesn't work here */ }
                                    header={ this.state.messageTitle }
                                    content={ this.state.messageContent }
                                    onDismiss={ this.hideMessage }
                                    positive={ this.state.successMessage }
                                     />
                                { this.state.queryResponseTable }
                            </React.Fragment>
                            : 
                            <CodeMirror
                                options={{ readOnly: true, mode: "sql"}}
                                value={ this.state.messageContent } />
                        : null }
                        
                        <Grid columns={2}>
                            <Grid.Column>
                                <Button content="Abschicken" onClick={ () => this.crudQuery(queryId) }/>
                            </Grid.Column>
                            <Grid.Column>
                                <Button color="red" content="Löschen" style={{float: "right"}} onClick={ () => this.deleteQuery(queryId) } />
                            </Grid.Column>
                        </Grid>
                    </Tab.Pane>
                    )
                }
            })
            i++;
        }
        this.setState({
            queryPanes: panes
        })
    }

    updateLocalQuery = (queryId, value) => {
        this.state.localQueryMap.set(queryId, value);
        this.forceUpdate();
    }

    crudQuery = (queryId) => {
        if (this.state.localQueryMap.get(queryId) === "") { // if query is empty don't do anything
            this.setState({
                messageTitle: "Fehler",
                messageContent: "Die Query darf nicht leer sein.",
                showMessage: true,
                successMessage: false,
                warningMessage: false
            });
            return
        }
        if (queryId == Number.MAX_SAFE_INTEGER) { // this is the not-yet-tracked query
            API.createQuery(this.state.exerciseId, this.state.localQueryMap.get(queryId))
            .then(response => {
                let newQueryId = response.data.id;
                // Add Query to Context
                this.state.context.addQuery(newQueryId, this.state.localQueryMap.get(queryId));
                // Link Query with exercise
                this.state.context.getExerciseById(this.state.exerciseId).addQuery(newQueryId);
                this.state.localQueryMap.set(newQueryId, this.state.localQueryMap.get(queryId));
                this.state.localQueryMap.delete(Number.MAX_SAFE_INTEGER);
                if (response.data.warning) { // Warning detected => Success Message with warning
                    this.showWarning(response.data.warning, response.data.result);
                } else {
                    this.showSuccess("Die Query wurde erfolgreich hinzugefügt.", response.data.result);
                }
            }).catch(error => {
                let unjoinedData = error.data;
                let data = <p>Fehler - Keine Daten über den Fehler erhalten.</p>;
                if (unjoinedData) data = unjoinedData.join("\n");   // Avoid null; Join, in case there are more than one error message
                this.setState({
                    messageTitle: "Fehler",
                    messageContent: data,
                    showMessage: true,
                    successMessage: false,
                    warningMessage: false
                })
            }).finally(() => {
                this.updatePanes();
                this.setState({
                    loading: false
                })
            })
        } else { // This query is tracked, so less work
            API.updateQuery(queryId, this.state.localQueryMap.get(queryId))
            .then(response => {
                this.state.context.updateQuery(queryId, this.state.localQueryMap.get(queryId));
                if (response.data.warning) {
                    this.showWarning(response.data.warning, response.data.result);
                } else {
                    this.showSuccess("Änderungen erfolgreich übernommen", response.data.result);
                }
            }).catch(error => {
                let unjoinedData = error.data;
                let data = <p>Fehler - Keine Daten über den Fehler erhalten.</p>;
                if (unjoinedData) data = unjoinedData.join("\n");   // Avoid null; Join, in case there are more than one error message
                this.setState({
                    messageTitle: "Fehler",
                    messageContent: data,
                    showMessage: true,
                    successMessage: false,
                    warningMessage: false
                })
            }).finally(() => {
                this.setState({
                    loading: false
                })
            })
        }
    }

    showWarning = (warning, tableArray) => {
        this.setState({
            messageTitle: "Erfolg - Achtung",
            messageContent: warning,
            showMessage: true,
            successMessage: false,
            warningMessage: true,
            queryResponseTable: <QueryResponseTable tableArray={ tableArray } />
        });
    }

    showSuccess = (messageContent, tableArray) => {
        this.setState({
            messageTitle: "Erfolg",
            messageContent: messageContent,
            showMessage: true,
            successMessage: true,
            showWarning: false,
            queryResponseTable: <QueryResponseTable tableArray={ tableArray } />
        })
    }

    deleteQuery = (queryId) => {
        if (queryId == Number.MAX_SAFE_INTEGER) {   // It's the local query
            this.state.localQueryMap.delete(queryId);
            this.setState({
                activeIndex: this.state.activeIndex - 1,
                showMessage: false
            });
            this.updatePanes();
        } else {
            API.deleteQuery(queryId)
            .then(response => {
                this.state.context.getExerciseById(this.props.exerciseId).removeQuery(queryId); // delete association from exercise
                this.state.context.removeQuery(queryId);                                        // remove from global query storage
                this.state.localQueryMap.delete(queryId);                                       // remove from local query storage
                this.setState({
                    activeIndex: this.state.activeIndex -1,
                    showMessage: false
                });
                this.updatePanes();
                this.props.showSuccessMessage("Erfolg", "Die Query wurde erfolgreich gelöscht.");
            }).catch(error => {
                // This technically cannot happen
                console.error(error);
            })
        }
    }

    hideMessage = () => {
        this.setState({
            showMessage: false
        });
    }
    forceUpdate = () => {
        this.setState({
            state: this.state
        })
    }
    render() {
        if (this.state.initialized) {
            return (
                <Tab menu={{
                    fluid: true,
                    vertical: true
                }}
                panes={this.state.queryPanes.concat(this.addQueryButton)} 
                onTabChange={ this.handleTabChange }
                activeIndex={ this.state.activeIndex }/>
            );
        } else {
            return <Loader active inline="centered">Lade Queries...</Loader>
        }
    }
}

const intComparator = (x, y) => {
    let a = x[0], b = y[0];
    if (a < b) return -1;
    else if (a > b) return 1;
    return 0; 
}

export default CRUDQueryView;