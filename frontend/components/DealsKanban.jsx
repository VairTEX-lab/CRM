import React, { useEffect, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";

export const STAGES = [
  "Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost"
];

function buildColumns(deals) {
  return STAGES.reduce((columns, stage) => {
    columns[stage] = deals.filter((deal) => deal.stage === stage);
    return columns;
  }, {});
}

export default function DealsKanban({ deals = [], onDealsChange }) {
  const [columns, setColumns] = useState(() => buildColumns(deals));

  useEffect(() => {
    setColumns(buildColumns(deals));
  }, [deals]);

  function handleDragEnd(result) {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    const sourceStage = source.droppableId;
    const destinationStage = destination.droppableId;

    if (
      sourceStage === destinationStage &&
      source.index === destination.index
    ) {
      return;
    }

    const nextColumns = {
      ...columns,
      [sourceStage]: [...columns[sourceStage]],
      [destinationStage]: [...columns[destinationStage]]
    };

    const [movedDeal] = nextColumns[sourceStage].splice(source.index, 1);
    const updatedDeal = { ...movedDeal, stage: destinationStage };

    nextColumns[destinationStage].splice(destination.index, 0, updatedDeal);
    setColumns(nextColumns);

    if (onDealsChange) {
      const updatedDeals = STAGES.flatMap((stage) => nextColumns[stage]).map(
        (deal) => (deal.id === updatedDeal.id ? updatedDeal : deal)
      );

      onDealsChange(updatedDeals, updatedDeal);
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={styles.board}>
        {STAGES.map((stage) => (
          <Droppable droppableId={stage} key={stage}>
            {(provided, snapshot) => (
              <section
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  ...styles.column,
                  ...(snapshot.isDraggingOver ? styles.columnActive : {})
                }}
              >
                <header style={styles.columnHeader}>
                  <h3 style={styles.columnTitle}>{stage}</h3>
                  <span style={styles.columnCount}>{columns[stage].length}</span>
                </header>

                {columns[stage].map((deal, index) => (
                  <Draggable
                    draggableId={String(deal.id)}
                    index={index}
                    key={deal.id}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <article
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        style={{
                          ...styles.card,
                          ...(dragSnapshot.isDragging ? styles.cardDragging : {}),
                          ...dragProvided.draggableProps.style
                        }}
                      >
                        <h4 style={styles.cardTitle}>{deal.deal_name}</h4>
                        <p style={styles.cardMeta}>
                          {deal.company_name || "No company linked"}
                        </p>
                        <p style={styles.cardMeta}>
                          ${Number(deal.deal_value || 0).toLocaleString()}
                        </p>
                        {deal.next_step ? (
                          <p style={styles.cardNextStep}>
                            Next: {deal.next_step}
                          </p>
                        ) : null}
                      </article>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </section>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}

const styles = {
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    alignItems: "start"
  },
  column: {
    background: "#f3f0e8",
    border: "1px solid #d8d0bf",
    borderRadius: "16px",
    minHeight: "320px",
    padding: "14px",
    transition: "background 0.2s ease, border-color 0.2s ease"
  },
  columnActive: {
    background: "#e8f3ea",
    borderColor: "#7da487"
  },
  columnHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px"
  },
  columnTitle: {
    margin: 0,
    fontSize: "1rem"
  },
  columnCount: {
    background: "#fffdf8",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "0.875rem"
  },
  card: {
    background: "#fffdf8",
    border: "1px solid #e5dcc8",
    borderRadius: "14px",
    padding: "12px",
    marginBottom: "10px",
    boxShadow: "0 1px 3px rgba(57, 45, 22, 0.08)"
  },
  cardDragging: {
    boxShadow: "0 12px 24px rgba(57, 45, 22, 0.18)"
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: "0.98rem"
  },
  cardMeta: {
    margin: "0 0 6px",
    color: "#5f574b",
    fontSize: "0.9rem"
  },
  cardNextStep: {
    margin: "10px 0 0",
    color: "#2b5b3f",
    fontSize: "0.88rem"
  }
};
