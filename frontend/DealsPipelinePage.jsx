import React, { useEffect, useState } from "react";
import DealsKanban from "./components/DealsKanban";

const API_BASE_URL = "http://localhost:3000";

export default function DealsPipelinePage() {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savingDealId, setSavingDealId] = useState(null);

  useEffect(() => {
    async function loadDeals() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/deals`);
        if (!response.ok) {
          throw new Error("Failed to load deals");
        }

        const data = await response.json();
        setDeals(data);
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadDeals();
  }, []);

  async function handleDealsChange(updatedDeals, updatedDeal) {
    const previousDeals = deals;

    setDeals(updatedDeals);
    setSavingDealId(updatedDeal.id);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/deals/${updatedDeal.id}/stage`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            stage: updatedDeal.stage,
            next_step: updatedDeal.next_step
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update deal stage");
      }

      const savedDeal = await response.json();
      setDeals((currentDeals) =>
        currentDeals.map((deal) => (deal.id === savedDeal.id ? savedDeal : deal))
      );
    } catch (error) {
      setDeals(previousDeals);
      setErrorMessage(error.message);
    } finally {
      setSavingDealId(null);
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>CRM Pipeline</p>
          <h1 style={styles.title}>Deals Board</h1>
        </div>
        {savingDealId ? (
          <p style={styles.status}>Saving deal #{savingDealId}...</p>
        ) : (
          <p style={styles.status}>Drag deals between stages to update them.</p>
        )}
      </header>

      {isLoading ? <p style={styles.message}>Loading deals...</p> : null}
      {errorMessage ? <p style={styles.error}>{errorMessage}</p> : null}

      {!isLoading ? (
        <DealsKanban deals={deals} onDealsChange={handleDealsChange} />
      ) : null}
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    background:
      "linear-gradient(180deg, #f5f2ea 0%, #ece6d8 52%, #e2dccb 100%)",
    color: "#2f261a"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "end",
    marginBottom: "24px"
  },
  eyebrow: {
    margin: 0,
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#76674d"
  },
  title: {
    margin: "6px 0 0",
    fontSize: "2rem"
  },
  status: {
    margin: 0,
    color: "#5f574b"
  },
  message: {
    color: "#5f574b"
  },
  error: {
    color: "#8a2f2f",
    fontWeight: 600
  }
};
