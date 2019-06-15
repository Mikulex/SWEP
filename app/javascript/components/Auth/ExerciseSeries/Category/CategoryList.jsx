import React, { useContext } from "react";
import { withRouter, Link } from "react-router-dom";
import {
    Container,
    Loader
} from "semantic-ui-react";

import CategoryListItem from "./CategoryListItem.jsx";
import { ExerciseSeriesContext } from '../ExerciseSeriesContext.jsx';


const CategoryList = (props) => {
    /*
        Hooks are only working with React function components, that's why we
        cannot use a class component.
    */
    const context = useContext(ExerciseSeriesContext);
    context.getCategories();

    return (
        <Container>
            <CategoryRender categories={ context.categories }/>
        </Container>
    );
}

class CategoryRender extends React.Component {
    render() {
        let categoryMenuItems = null;
        if (this.props.categories) {
            categoryMenuItems = 
            [...this.props.categories].map(([id, category]) => 
            <CategoryListItem
                title={ category.title}
                description={ category.description }
                solvedExerciseCount={ category.solvedExerciseCount }
                totalExerciseCount={ category.totalExerciseCount }
                categoryId={ category.id} 
                key={ "us" + category.id }/>);
            categoryMenuItems.push(
                window._userRole === "admin" ?
                <CategoryListItem
                    title="Übungsserie erstellen"
                    description=""
                    solvedExerciseCount="42"
                    totalExerciseCount="42"
                    categoryId="createseries"
                    admin={true}
                    key="admin"
                    />
            : null)
        }

        return (
            <React.Fragment>
                { categoryMenuItems ? categoryMenuItems
                : <Loader active>Lädt...</Loader> }
            </React.Fragment>
        );
    }
}

export default CategoryList;