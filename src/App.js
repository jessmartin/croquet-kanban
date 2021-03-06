import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import dataset from './dataset'
import Column from './Column'
import { DragDropContext, Droppable } from 'react-beautiful-dnd'

import { Model } from "@croquet/croquet";
import { InCroquetSession, useModelRoot, usePublish, useSubscribe } from '@croquet/react';

class BoardModel extends Model {
  init(option) {
    super.init(option);
    this.lists = new Map();
    this.tasks = new Map();

    this.subscribe(this.id, "task-moved", this.onTaskMoved);
  }

  onTaskMoved(data) {
    const { taskId, newListId } = data;
    this.publish("task-moved", { taskId, newListId });
  }

}

BoardModel.register("BoardModel");

const Container = styled.div`
    display : flex;
`

const App = () => {
  return (
    <InCroquetSession
      name="croquet-trello"
      apiKey="1_bdoj07sd3kzujn95jhplk2pz8xuio3pbmxx3k7q6"
      appId="in.jessmart.croquet.trello"
      password="abc"
      model={BoardModel}
      eventRateLimit={60}
      debug="session,messages,sends,subscribe"
    >
      <TrelloBoard />
    </InCroquetSession >
  )
}

const TrelloBoard = () => {
  const model = useModelRoot();
  const [data, setData] = useState(dataset)
  const publishTaskMoved = usePublish((id, newListId) => [
    model.id, "task-moved", { taskId: id, newListId }
  ])

  const onDragEnd = result => {
    const { destination, source, draggableId, type } = result;
    //If there is no destination
    if (!destination) { return }

    //If source and destination is the same
    if (destination.droppableId === source.droppableId && destination.index === source.index) { return }

    //If you're dragging columns
    if (type === 'column') {
      const newColumnOrder = Array.from(data.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);
      const newState = {
        ...data,
        columnOrder: newColumnOrder
      }
      setData(newState)
      return;
    }

    //Anything below this happens if you're dragging tasks
    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];

    //If dropped inside the same column
    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      const newColumn = {
        ...start,
        taskIds: newTaskIds
      }
      const newState = {
        ...data,
        columns: {
          ...data.columns,
          [newColumn.id]: newColumn
        }
      }
      setData(newState)
      return;
    }

    //If dropped in a different column
    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = {
      ...start,
      taskIds: startTaskIds
    }

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = {
      ...finish,
      taskIds: finishTaskIds
    }

    const newState = {
      ...data,
      columns: {
        ...data.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish
      }
    }
    publishTaskMoved(draggableId, destination.droppableId);

    setData(newState)
  }

  const moveTask = useCallback(
    (dragIndex, hoverIndex, droppableId) => {
      // create the new state by moving the task to the appropriate list
      // setData(newState)
    }
  );
  // useSubscribe(model.id, "task-moved", moveTask);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId='all-columns' direction='horizontal' type='column'>
        {(provided) => (
          <Container {...provided.droppableProps} ref={provided.innerRef}>
            {data.columnOrder.map((id, index) => {
              const column = data.columns[id]
              const tasks = column.taskIds.map(taskId => data.tasks[taskId])

              return <Column key={column.id} column={column} tasks={tasks} index={index} />
            })}
            {provided.placeholder}
          </Container>
        )}
      </Droppable>
    </DragDropContext >
  )
}

export default App
