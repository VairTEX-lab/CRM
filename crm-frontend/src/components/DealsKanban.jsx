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

function buildColumns(deals, stages) {
  return stages.reduce((columns, stage) => {
    columns[stage] = deals.filter((deal) => deal.stage === stage);
    return columns;
  }, {});
}

export default function DealsKanban({
  deals = [],
  onDealsChange,
  stages = STAGES.filter((stage) => stage !== "Qualified"),
  onDealClick,
  onDealContextMenu
}) {
  const [columns, setColumns] = useState(() => buildColumns(deals, stages));
  const theme = {
    columnBackground: "#f7f8fa",
    columnBorder: "#d9d9d9",
    columnActiveBackground: "#e8f0f8",
    columnActiveBorder: "#004685",
    cardBackground: "#ffffff",
    cardBorder: "#d9d9d9",
    cardShadow: "0 1px 3px rgba(57, 45, 22, 0.08)",
    cardDraggingShadow: "0 12px 24px rgba(57, 45, 22, 0.18)",
    countBackground: "#ffffff",
    countBorder: "#c7d3e0",
    titleText: "#0b2f57",
    mutedText: "#797979",
    accentText: "#004685"
  };

  useEffect(() => {
    setColumns(buildColumns(deals, stages));
  }, [deals, stages]);

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
      onDealsChange(updatedDeal);
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={styles.board}>
        {stages.map((stage) => (
          <Droppable droppableId={stage} key={stage}>
            {(provided, snapshot) => (
              <section
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  ...styles.column,
                  background: theme.columnBackground,
                  borderColor: theme.columnBorder,
                  ...(snapshot.isDraggingOver ? styles.columnActive : {})
                }}
              >
                <header style={styles.columnHeader}>
                  <h3 style={{ ...styles.columnTitle, color: theme.titleText }}>{stage}</h3>
                  <span
                    style={{
                      ...styles.columnCount,
                      background: theme.countBackground,
                      borderColor: theme.countBorder,
                      color: theme.titleText
                    }}
                  >
                    {columns[stage].length}
                  </span>
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
                        onClick={() => onDealClick?.(deal)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          onDealContextMenu?.(event, deal);
                        }}
                        style={{
                          ...styles.card,
                          background: theme.cardBackground,
                          borderColor: theme.cardBorder,
                          boxShadow: theme.cardShadow,
                          ...(dragSnapshot.isDragging ? styles.cardDragging : {}),
                          ...dragProvided.draggableProps.style
                        }}
                      >
                        <h4 style={styles.cardTitle}>{deal.deal_name}</h4>
                        <p style={styles.cardMeta}>
                          {deal.company_name || `Company #${deal.company_id ?? "N/A"}`}
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
    fontSize: "1rem",
    fontFamily: '"League Spartan", "Arial Black", sans-serif',
    letterSpacing: "0.02em"
  },
  columnCount: {
    background: "#fffdf8",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "0.875rem",
    border: "1px solid #d9d9d9"
  },
  card: {
    border: "1px solid #e5dcc8",
    borderRadius: "14px",
    padding: "12px",
    marginBottom: "10px"
  },
  cardDragging: {
    boxShadow: "0 12px 24px rgba(57, 45, 22, 0.18)"
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: "0.98rem",
    fontFamily: '"League Spartan", "Arial Black", sans-serif',
    color: "#004685"
  },
  cardMeta: {
    margin: "0 0 6px",
    color: "#797979",
    fontSize: "0.9rem"
  },
  cardNextStep: {
    margin: "10px 0 0",
    color: "#004685",
    fontSize: "0.88rem"
  }
};
