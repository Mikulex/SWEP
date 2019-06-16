class Api::ExercisesController < ApplicationController

    before_action :logged_in_user
    before_action :admin_user, only: [:create, :destroy]

    def show
        @exercise = Exercise.find(params[:id])
        render json: @exercise, status: :ok
    end

    def index
        offset = params[:offset].to_i
        limit = params[:limit].nil? ? 30 : params[:limit].to_i

        @exercises = Category.find(params[:category_id]).exercises.offset(offset).limit(limit)
        render json: @exercises, status: :ok
    end

    def create
        @exercise = Category.find(params[:category_id]).exercises.build(exercise_params)
        if @exercise.save
            render json: @exercise, status: :created
        else
            render json: @exercise.errors, status: :unprocessable_entity

        end
    end

    def destroy
        if @exercise = Exercise.find_by(id: params[:id])
            @exercise.destroy
        end
        head :no_content
    end

    def update
        # TODO
    end

    private
        def exercise_params
            params.require(:exercise).permit(:title, :text, :points)
        end

    

end
