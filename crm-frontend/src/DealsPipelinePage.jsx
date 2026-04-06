import React, { useEffect, useState } from "react";
import DealsKanban from "./components/DealsKanban";
import vairtexLogo from "./assets/vairtex-logo.png";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const BRAND = {
  name: "VairTEX CRM",
  primary: "#004685",
  primarySoft: "#e8f0f8",
  accent: "#004685",
  accentSoft: "#e8f0f8",
  ink: "#000000",
  sand: "#ffffff",
  sandDeep: "#0d4f90",
  card: "#ffffff",
  border: "#d9d9d9",
  danger: "#8a2f2f",
  muted: "#797979"
};

function isPhoneFragment(value) {
  if (!value) {
    return false;
  }

  const normalized = String(value).trim();
  const digits = normalized.replace(/\D/g, "");

  if (digits.length >= 7) {
    return true;
  }

  return /\b(phone|cell|mobile|direct|office|corporate)\b/i.test(normalized) && /\d/.test(normalized);
}

function buildPhoneFromParts(firstName, lastName, phone) {
  if (phone) {
    return String(phone).trim();
  }

  const parts = [firstName, lastName].filter(isPhoneFragment).map((value) => String(value).trim());
  return parts.length > 0 ? parts.join(" ") : "";
}

function buildPersonName(firstName, lastName) {
  const safeFirstName = String(firstName || "").trim();
  const safeLastName = String(lastName || "").trim();
  const combined = [safeFirstName, safeLastName].filter(Boolean).join(" ").trim();
  const combinedDigits = combined.replace(/\D/g, "").length;
  const combinedHasLetters = /[A-Za-z]/.test(combined);

  if (!combined) {
    return "";
  }

  if (isPhoneFragment(safeFirstName) && !safeLastName) {
    return "";
  }

  if (isPhoneFragment(safeLastName) && !safeFirstName) {
    return "";
  }

  if (combinedDigits >= 7 && (!combinedHasLetters || /\b(phone|cell|mobile|direct|office|corporate|contact)\b/i.test(combined))) {
    return "";
  }

  return [safeFirstName, safeLastName].filter(Boolean).join(" ").trim();
}

function buildContactOptionLabel(contact, companyName) {
  return (
    buildPersonName(contact.first_name, contact.last_name) ||
    buildPhoneFromParts(contact.first_name, contact.last_name, contact.phone) ||
    companyName ||
    "Unnamed contact"
  );
}

function splitLeadContactName(fullName) {
  const cleaned = String(fullName || "").trim();

  if (!cleaned) {
    return { firstName: "", lastName: "" };
  }

  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1]
  };
}

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

export default function DealsPipelinePage({ token, onLogout, currentUser }) {
  const pipelineStages = ["Lead", "Proposal", "Negotiation", "Won", "Lost"];
  const [activeView, setActiveView] = useState("pipeline");
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingDealId, setSavingDealId] = useState(null);
  const [contactSearch, setContactSearch] = useState("");
  const [dealSearch, setDealSearch] = useState("");
  const [dealStageFilter, setDealStageFilter] = useState("All");
  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [editingDeal, setEditingDeal] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [contactForm, setContactForm] = useState({
    company_id: "",
    tag: "Contacted",
    first_name: "",
    last_name: "",
    email: "",
    title: "",
    phone: ""
  });
  const [companyForm, setCompanyForm] = useState({
    name: "",
    industry: "",
    location: "",
    work_phone: "",
    assignee: ""
  });
  const [dealForm, setDealForm] = useState({
    company_id: "",
    contact_id: "",
    deal_name: "",
    stage: "Lead",
    deal_value: "",
    close_probability: "",
    next_step: "",
    owner: "",
    priority: "Medium",
    status: "Open",
    operational_impact_statement: "",
    financial_impact: "",
    failure_mode: ""
  });
  const [leadForm, setLeadForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    deal_name: "",
    next_step: "",
    owner: "",
    priority: "Medium",
    notes: ""
  });

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      onLogout?.();
      throw new Error("Your session expired. Please sign in again.");
    }

    return response;
  }

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const [companiesResponse, contactsResponse, dealsResponse] = await Promise.all([
          apiFetch("/companies"),
          apiFetch("/contacts"),
          apiFetch("/deals")
        ]);

        if (!companiesResponse.ok || !contactsResponse.ok || !dealsResponse.ok) {
          throw new Error("Failed to load CRM data");
        }

        const [companiesData, contactsData, dealsData] = await Promise.all([
          companiesResponse.json(),
          contactsResponse.json(),
          dealsResponse.json()
        ]);

        setCompanies(companiesData);
        setContacts(contactsData);
        setDeals(dealsData);
        setSelectedCompanyId(companiesData[0]?.id ?? null);
        setSelectedContactId(contactsData[0]?.id ?? null);
        setSelectedDealId(dealsData[0]?.id ?? null);

        if (!contactForm.company_id && companiesData[0]) {
          setContactForm((current) => ({
            ...current,
            company_id: String(companiesData[0].id)
          }));
        }

        if (!dealForm.company_id && companiesData[0]) {
          const firstCompanyId = String(companiesData[0].id);
          const firstContact = contactsData.find(
            (contact) => String(contact.company_id) === firstCompanyId
          );

          setDealForm((current) => ({
            ...current,
            company_id: firstCompanyId,
            contact_id: firstContact ? String(firstContact.id) : ""
          }));
        }

      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const companiesById = new Map(companies.map((company) => [String(company.id), company]));
  const contactsById = new Map(contacts.map((contact) => [String(contact.id), contact]));

  const enrichedContacts = contacts.map((contact) => {
    const companyName = companiesById.get(String(contact.company_id))?.name || "Unassigned";
    const displayPhone = buildPhoneFromParts(contact.first_name, contact.last_name, contact.phone);
    const personName = buildPersonName(contact.first_name, contact.last_name);

    return {
      ...contact,
      company_name: companyName,
      person_name: personName,
      display_phone: displayPhone,
      primary_label: companyName,
      secondary_label: personName || displayPhone || "No contact person yet",
      tertiary_label: personName
        ? contact.email || displayPhone || "No email or phone yet"
        : contact.email || contact.title || "No email yet"
    };
  });

  const enrichedDeals = deals.map((deal) => ({
    ...deal,
    company_name: companiesById.get(String(deal.company_id))?.name || null,
    contact_name: contactsById.get(String(deal.contact_id))
      ? buildPersonName(
          contactsById.get(String(deal.contact_id)).first_name,
          contactsById.get(String(deal.contact_id)).last_name
        ) ||
        buildPhoneFromParts(
          contactsById.get(String(deal.contact_id)).first_name,
          contactsById.get(String(deal.contact_id)).last_name,
          contactsById.get(String(deal.contact_id)).phone
        ) ||
        companiesById.get(String(deal.company_id))?.name ||
        null
      : null
  }));

  const qualifiedReferenceItems = enrichedDeals
    .filter((deal) => deal.stage === "Qualified")
    .map((deal) => {
      const scoreFromName = deal.deal_name?.match(/\((\d+)%\)/);
      const score = scoreFromName
        ? Number(scoreFromName[1])
        : Number(deal.close_probability || 0);

      return {
        ...deal,
        reference_name: deal.deal_name?.replace(/\s*\(\d+%\)\s*$/, "") || "Unnamed Industry",
        reference_score: score
      };
    })
    .sort((left, right) => right.reference_score - left.reference_score);

  const activePipelineDeals = enrichedDeals.filter(
    (deal) =>
      !["Won", "Lost"].includes(deal.stage) &&
      deal.source !== "Leads Inbox"
  );

  const wonDeals = enrichedDeals.filter((deal) => deal.stage === "Won");
  const lostDeals = enrichedDeals.filter((deal) => deal.stage === "Lost");
  const openPipelineValue = activePipelineDeals.reduce(
    (sum, deal) => sum + Number(deal.deal_value || 0),
    0
  );
  const wonValue = wonDeals.reduce(
    (sum, deal) => sum + Number(deal.deal_value || 0),
    0
  );
  const averageOpenDealValue =
    activePipelineDeals.length > 0 ? openPipelineValue / activePipelineDeals.length : 0;
  const totalClosedDeals = wonDeals.length + lostDeals.length;
  const winRate = totalClosedDeals > 0 ? Math.round((wonDeals.length / totalClosedDeals) * 100) : 0;

  const dealsByStage = pipelineStages.map((stage) => {
    const stageDeals = enrichedDeals.filter((deal) => deal.stage === stage);
    const stageValue = stageDeals.reduce((sum, deal) => sum + Number(deal.deal_value || 0), 0);

    return {
      stage,
      count: stageDeals.length,
      value: stageValue
    };
  });

  const maxStageCount = Math.max(...dealsByStage.map((item) => item.count), 1);

  const topCompaniesByDealValue = Object.values(
    activePipelineDeals.reduce((accumulator, deal) => {
      const key = deal.company_name || "Unassigned";
      if (!accumulator[key]) {
        accumulator[key] = { name: key, value: 0, count: 0 };
      }

      accumulator[key].value += Number(deal.deal_value || 0);
      accumulator[key].count += 1;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);

  const ownerLeaderboard = Object.values(
    activePipelineDeals.reduce((accumulator, deal) => {
      const key = deal.owner || "Unassigned";
      if (!accumulator[key]) {
        accumulator[key] = { owner: key, value: 0, count: 0 };
      }

      accumulator[key].value += Number(deal.deal_value || 0);
      accumulator[key].count += 1;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);

  const filteredCompanies = companies.filter((company) => {
    const haystack = [company.name, company.industry, company.location, company.assignee]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(companySearch.toLowerCase());
  });

  const filteredContacts = enrichedContacts.filter((contact) => {
    const haystack = [
      contact.first_name,
      contact.last_name,
      contact.email,
      contact.phone,
      contact.display_phone,
      contact.title,
      contact.tag,
      contact.person_name,
      contact.company_name
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(contactSearch.toLowerCase());
  });

  const filteredDeals = enrichedDeals.filter((deal) => {
    const matchesStage =
      dealStageFilter === "All" ? true : deal.stage === dealStageFilter;
    const haystack = [
      deal.deal_name,
      deal.stage,
      deal.owner,
      deal.next_step,
      deal.description
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesStage && haystack.includes(dealSearch.toLowerCase());
  });

  const pipelineDeals = enrichedDeals.filter((deal) =>
    pipelineStages.includes(deal.stage) && deal.source !== "Leads Inbox"
  );

  const leadsInboxDeals = enrichedDeals
    .filter((deal) => deal.source === "Leads Inbox")
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));

  const selectedContact =
    filteredContacts.find((contact) => String(contact.id) === String(selectedContactId)) ||
    enrichedContacts.find((contact) => String(contact.id) === String(selectedContactId)) ||
    null;

  const selectedDeal =
    filteredDeals.find((deal) => String(deal.id) === String(selectedDealId)) ||
    enrichedDeals.find((deal) => String(deal.id) === String(selectedDealId)) ||
    null;

  const selectedCompany =
    filteredCompanies.find((company) => String(company.id) === String(selectedCompanyId)) ||
    companies.find((company) => String(company.id) === String(selectedCompanyId)) ||
    null;

  const selectedCompanyContacts = enrichedContacts.filter(
    (contact) => String(contact.company_id) === String(selectedCompany?.id)
  );

  const selectedCompanyDeals = enrichedDeals.filter(
    (deal) =>
      String(deal.company_id) === String(selectedCompany?.id) &&
      deal.source !== "Leads Inbox"
  );

  const contactsForSelectedCompany = contacts.filter(
    (contact) => String(contact.company_id) === String(dealForm.company_id)
  );

  const contactsForEditingDeal = contacts.filter(
    (contact) => String(contact.company_id) === String(editingDeal?.company_id)
  );

  async function handleDealsChange(updatedDeal) {
    const previousDeals = deals;

    setDeals((currentDeals) =>
      currentDeals.map((deal) =>
        deal.id === updatedDeal.id ? { ...deal, stage: updatedDeal.stage } : deal
      )
    );
    setSavingDealId(updatedDeal.id);
    setErrorMessage("");

    try {
      const response = await apiFetch(
        `/deals/${updatedDeal.id}/stage`,
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
      setSuccessMessage(`Deal "${savedDeal.deal_name}" moved to ${savedDeal.stage}.`);
    } catch (error) {
      setDeals(previousDeals);
      setErrorMessage(error.message);
    } finally {
      setSavingDealId(null);
    }
  }

  function handleContactFormChange(event) {
    const { name, value } = event.target;
    setContactForm((current) => ({ ...current, [name]: value }));
  }

  function handleCompanyFormChange(event) {
    const { name, value } = event.target;
    setCompanyForm((current) => ({ ...current, [name]: value }));
  }

  function handleDealFormChange(event) {
    const { name, value } = event.target;
    setDealForm((current) => {
      const nextForm = { ...current, [name]: value };

      if (name === "company_id") {
        const firstContact = contacts.find(
          (contact) => String(contact.company_id) === String(value)
        );
        nextForm.contact_id = firstContact ? String(firstContact.id) : "";
      }

      return nextForm;
    });
  }

  function handleLeadFormChange(event) {
    const { name, value } = event.target;
    setLeadForm((current) => ({ ...current, [name]: value }));
  }

  function openContactEditor(contact) {
    setContextMenu(null);
    setSelectedContactId(contact.id);
    setEditingContact({
      id: contact.id,
      company_id: contact.company_id ? String(contact.company_id) : "",
      tag: contact.tag || "Contacted",
      first_name: contact.person_name ? contact.first_name || "" : "",
      last_name: contact.person_name ? contact.last_name || "" : "",
      email: contact.email || "",
      title: contact.title || "",
      phone: contact.display_phone || "",
      notes: contact.notes || ""
    });
  }

  function openDealEditor(deal) {
    setContextMenu(null);
    setSelectedDealId(deal.id);
    setEditingDeal({
      id: deal.id,
      company_id: deal.company_id ? String(deal.company_id) : "",
      contact_id: deal.contact_id ? String(deal.contact_id) : "",
      deal_name: deal.deal_name || "",
      stage: deal.stage || "Lead",
      deal_value: deal.deal_value ?? "",
      close_probability: deal.close_probability ?? "",
      next_step: deal.next_step || "",
      owner: deal.owner || "",
      priority: deal.priority || "Medium",
      status: deal.status || "Open",
      operational_impact_statement: deal.operational_impact_statement || "",
      financial_impact: deal.financial_impact || "",
      failure_mode: deal.failure_mode || ""
    });
  }

  function openContextMenu(event, type, record) {
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type,
      record
    });
  }

  function handleEditingContactChange(event) {
    const { name, value } = event.target;
    setEditingContact((current) => ({ ...current, [name]: value }));
  }

  function handleEditingDealChange(event) {
    const { name, value } = event.target;
    setEditingDeal((current) => {
      const next = { ...current, [name]: value };

      if (name === "company_id") {
        const firstContact = contacts.find(
          (contact) => String(contact.company_id) === String(value)
        );
        next.contact_id = firstContact ? String(firstContact.id) : "";
      }

      return next;
    });
  }

  async function handleUpdateContact(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await apiFetch(`/contacts/${editingContact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: editingContact.company_id ? Number(editingContact.company_id) : null,
          tag: editingContact.tag,
          first_name: editingContact.first_name,
          last_name: editingContact.last_name,
          email: editingContact.email,
          title: editingContact.title,
          phone: editingContact.phone,
          notes: editingContact.notes
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update contact");
      }

      setContacts((current) =>
        current.map((contact) => (contact.id === data.id ? data : contact))
      );
      setEditingContact(null);
      setSelectedContactId(data.id);
      const contactName = buildPersonName(data.first_name, data.last_name) || companiesById.get(String(data.company_id))?.name || "Contact";
      setSuccessMessage(`Contact "${contactName}" updated.`);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleUpdateDeal(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await apiFetch(`/deals/${editingDeal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: editingDeal.company_id ? Number(editingDeal.company_id) : null,
          contact_id: editingDeal.contact_id ? Number(editingDeal.contact_id) : null,
          deal_name: editingDeal.deal_name,
          stage: editingDeal.stage,
          deal_value: editingDeal.deal_value === "" ? 0 : Number(editingDeal.deal_value),
          close_probability:
            editingDeal.close_probability === ""
              ? null
              : Number(editingDeal.close_probability),
          next_step: editingDeal.next_step,
          owner: editingDeal.owner,
          priority: editingDeal.priority,
          status: editingDeal.status,
          operational_impact_statement: editingDeal.operational_impact_statement,
          financial_impact: editingDeal.financial_impact,
          failure_mode: editingDeal.failure_mode
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update deal");
      }

      setDeals((current) => current.map((deal) => (deal.id === data.id ? data : deal)));
      setEditingDeal(null);
      setSelectedDealId(data.id);
      setSuccessMessage(`Deal "${data.deal_name}" updated.`);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleDeleteContact(contactId) {
    setContextMenu(null);
    const target = contacts.find((contact) => contact.id === contactId);
    if (!window.confirm(`Delete contact "${target?.first_name || ""} ${target?.last_name || ""}"?`)) {
      return;
    }

    try {
      const response = await apiFetch(`/contacts/${contactId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete contact");
      }

      setContacts((current) => current.filter((contact) => contact.id !== contactId));
      setSelectedContactId((current) => (String(current) === String(contactId) ? null : current));
      setEditingContact(null);
      setSuccessMessage("Contact deleted.");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleDeleteDeal(dealId) {
    setContextMenu(null);
    const target = deals.find((deal) => deal.id === dealId);
    if (!window.confirm(`Delete deal "${target?.deal_name || ""}"?`)) {
      return;
    }

    try {
      const response = await apiFetch(`/deals/${dealId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete deal");
      }

      setDeals((current) => current.filter((deal) => deal.id !== dealId));
      setSelectedDealId((current) => (String(current) === String(dealId) ? null : current));
      setEditingDeal(null);
      setSuccessMessage("Deal deleted.");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleCreateContact(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await apiFetch(`/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: contactForm.company_id ? Number(contactForm.company_id) : null,
          tag: contactForm.tag,
          first_name: contactForm.first_name,
          last_name: contactForm.last_name,
          email: contactForm.email,
          title: contactForm.title,
          phone: contactForm.phone
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create contact");
      }

      setContacts((current) => [...current, data]);
      setContactForm((current) => ({
        ...current,
        first_name: "",
        last_name: "",
        email: "",
        title: "",
        phone: ""
      }));
      const contactName = buildPersonName(data.first_name, data.last_name) || companiesById.get(String(data.company_id))?.name || "Contact";
      setSuccessMessage(`Contact "${contactName}" created.`);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleCreateCompany(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await apiFetch(`/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create company");
      }

      setCompanies((current) => [...current, data]);
      setSelectedCompanyId(data.id);
      setCompanyForm({
        name: "",
        industry: "",
        location: "",
        work_phone: "",
        assignee: ""
      });
      setSuccessMessage(`Company "${data.name}" created.`);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleCreateDeal(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await apiFetch(`/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: dealForm.company_id ? Number(dealForm.company_id) : null,
          contact_id: dealForm.contact_id ? Number(dealForm.contact_id) : null,
          deal_name: dealForm.deal_name,
          stage: dealForm.stage,
          deal_value: dealForm.deal_value === "" ? 0 : Number(dealForm.deal_value),
          close_probability:
            dealForm.close_probability === ""
              ? null
              : Number(dealForm.close_probability),
          next_step: dealForm.next_step,
          owner: dealForm.owner,
          priority: dealForm.priority,
          status: dealForm.status,
          operational_impact_statement: dealForm.operational_impact_statement,
          financial_impact: dealForm.financial_impact,
          failure_mode: dealForm.failure_mode
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create deal");
      }

      setDeals((current) => [...current, data]);
      setDealForm((current) => ({
        ...current,
        deal_name: "",
        deal_value: "",
        close_probability: "",
        next_step: "",
        owner: "",
        operational_impact_statement: "",
        financial_impact: "",
        failure_mode: ""
      }));
      setSuccessMessage(`Deal "${data.deal_name}" created.`);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleCreateLead(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      let companyId = null;
      let contactId = null;

      const normalizedCompanyName = String(leadForm.company_name || "").trim();
      const normalizedContactName = String(leadForm.contact_name || "").trim();
      const normalizedContactEmail = String(leadForm.contact_email || "").trim().toLowerCase();
      const normalizedContactPhone = String(leadForm.contact_phone || "").trim();

      if (normalizedCompanyName) {
        const existingCompany = companies.find(
          (company) => company.name?.trim().toLowerCase() === normalizedCompanyName.toLowerCase()
        );

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const companyResponse = await apiFetch(`/companies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: normalizedCompanyName,
              industry: "",
              location: "",
              work_phone: "",
              assignee: leadForm.owner || ""
            })
          });

          const companyData = await companyResponse.json();
          if (!companyResponse.ok) {
            throw new Error(companyData.error || "Failed to create company for lead");
          }

          companyId = companyData.id;
          setCompanies((current) => [...current, companyData]);
        }
      }

      if (normalizedContactName || normalizedContactEmail || normalizedContactPhone) {
        const existingContact = contacts.find((contact) => {
          const sameCompany = String(contact.company_id || "") === String(companyId || "");
          const sameEmail =
            normalizedContactEmail &&
            String(contact.email || "").trim().toLowerCase() === normalizedContactEmail;
          const samePhone =
            normalizedContactPhone &&
            String(contact.phone || "").trim() === normalizedContactPhone;
          const sameName =
            normalizedContactName &&
            buildPersonName(contact.first_name, contact.last_name).toLowerCase() ===
              normalizedContactName.toLowerCase();

          return sameCompany && (sameEmail || samePhone || sameName);
        });

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const { firstName, lastName } = splitLeadContactName(normalizedContactName);
          const contactResponse = await apiFetch(`/contacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company_id: companyId,
              tag: "Lead",
              first_name: firstName,
              last_name: lastName,
              email: normalizedContactEmail,
              phone: normalizedContactPhone,
              title: ""
            })
          });

          const contactData = await contactResponse.json();
          if (!contactResponse.ok) {
            throw new Error(contactData.error || "Failed to create contact for lead");
          }

          contactId = contactData.id;
          setContacts((current) => [...current, contactData]);
        }
      }

      const response = await apiFetch(`/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          contact_id: contactId,
          deal_name: leadForm.deal_name,
          stage: "Lead",
          deal_value: 0,
          close_probability: null,
          next_step: leadForm.next_step,
          owner: leadForm.owner,
          priority: leadForm.priority,
          status: "Open",
          source: "Leads Inbox",
          description: leadForm.notes
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create lead");
      }

      setDeals((current) => [...current, data]);
      setLeadForm((current) => ({
        ...current,
        company_name: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        deal_name: "",
        next_step: "",
        owner: "",
        notes: ""
      }));
      setSuccessMessage(`Lead "${data.deal_name}" added to the inbox.`);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handlePromoteLead(lead) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await apiFetch(`/deals/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: lead.company_id ?? null,
          contact_id: lead.contact_id ?? null,
          deal_name: lead.deal_name,
          stage: "Lead",
          deal_value: Number(lead.deal_value || 0),
          close_probability: lead.close_probability ?? null,
          operational_impact_statement: lead.operational_impact_statement,
          financial_impact: lead.financial_impact,
          failure_mode: lead.failure_mode,
          next_step: lead.next_step || "Follow up with lead",
          owner: lead.owner,
          status: lead.status || "Open",
          priority: lead.priority,
          source: null,
          description: lead.description
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to move lead into the pipeline");
      }

      setDeals((current) => current.map((deal) => (deal.id === data.id ? data : deal)));
      setSelectedDealId(data.id);
      setSuccessMessage(`Lead "${data.deal_name}" moved into the pipeline.`);
      setActiveView("pipeline");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brandBlock}>
          <img src={vairtexLogo} alt="VairTEX logo" style={styles.logo} />
          <div style={styles.brandText}>
            <p style={styles.eyebrow}>CRM Workspace</p>
            <h1 style={styles.title}>{BRAND.name}</h1>
            <p style={styles.subhead}>
              Pipeline, contacts, and forms all in one place.
            </p>
          </div>
        </div>
        <div style={styles.userBadge}>
          <div style={styles.userMeta}>
            <span style={styles.userLabel}>Signed in</span>
            <strong>{currentUser?.email || "CRM User"}</strong>
          </div>
          <button type="button" style={styles.buttonSecondary} onClick={onLogout}>
            Log Out
          </button>
        </div>
      </header>

      {savingDealId ? (
        <p style={styles.status}>Saving deal #{savingDealId}...</p>
      ) : (
        <p style={styles.status}>Drag deals between stages to update them.</p>
      )}

      <nav style={styles.tabs}>
        {[
          ["dashboard", "Dashboard"],
          ["leads-inbox", "Leads Inbox"],
          ["pipeline", "Pipeline"],
          ["companies", "Companies"],
          ["contacts", "Contacts"],
          ["deals", "Deals"],
          ["opportunity-reference", "Opportunity Reference"]
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            style={{
              ...styles.tabButton,
              ...(activeView === key ? styles.tabButtonActive : {})
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {isLoading ? <p style={styles.message}>Loading deals...</p> : null}
      {errorMessage ? <p style={styles.error}>{errorMessage}</p> : null}
      {successMessage ? <p style={styles.success}>{successMessage}</p> : null}

      {!isLoading ? (
        <>
          {activeView === "dashboard" ? (
            <>
              <section style={styles.dashboardHeroGrid}>
                <article style={styles.metricCard}>
                  <span style={styles.metricLabel}>Open pipeline value</span>
                  <strong style={styles.metricValue}>{formatCurrency(openPipelineValue)}</strong>
                  <span style={styles.metricSubtext}>{activePipelineDeals.length} active deals</span>
                </article>
                <article style={styles.metricCard}>
                  <span style={styles.metricLabel}>Won value</span>
                  <strong style={styles.metricValue}>{formatCurrency(wonValue)}</strong>
                  <span style={styles.metricSubtext}>{wonDeals.length} won deals</span>
                </article>
                <article style={styles.metricCard}>
                  <span style={styles.metricLabel}>Win rate</span>
                  <strong style={styles.metricValue}>{winRate}%</strong>
                  <span style={styles.metricSubtext}>{totalClosedDeals} closed deals tracked</span>
                </article>
                <article style={styles.metricCard}>
                  <span style={styles.metricLabel}>Leads waiting</span>
                  <strong style={styles.metricValue}>{leadsInboxDeals.length}</strong>
                  <span style={styles.metricSubtext}>Inbox opportunities not yet promoted</span>
                </article>
              </section>

              <section style={styles.dashboardMainGrid}>
                <article style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>Pipeline by stage</h2>
                    <span style={styles.helperText}>Stage count and value overview</span>
                  </div>
                  <div style={styles.dashboardList}>
                    {dealsByStage.map((item) => (
                      <div key={item.stage} style={styles.stageRow}>
                        <div style={styles.stageRowHeader}>
                          <strong>{item.stage}</strong>
                          <span>{item.count} deals</span>
                        </div>
                        <div style={styles.stageBarTrack}>
                          <div
                            style={{
                              ...styles.stageBarFill,
                              width: `${(item.count / maxStageCount) * 100}%`
                            }}
                          />
                        </div>
                        <span style={styles.stageRowValue}>{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>Performance snapshot</h2>
                    <span style={styles.helperText}>Quick leadership view</span>
                  </div>
                  <div style={styles.dashboardList}>
                    <div style={styles.snapshotCard}>
                      <span style={styles.metricLabel}>Average open deal</span>
                      <strong style={styles.snapshotValue}>{formatCurrency(averageOpenDealValue)}</strong>
                    </div>
                    <div style={styles.snapshotCard}>
                      <span style={styles.metricLabel}>Opportunity reference items</span>
                      <strong style={styles.snapshotValue}>{qualifiedReferenceItems.length}</strong>
                    </div>
                    <div style={styles.snapshotCard}>
                      <span style={styles.metricLabel}>Companies in CRM</span>
                      <strong style={styles.snapshotValue}>{companies.length}</strong>
                    </div>
                    <div style={styles.snapshotCard}>
                      <span style={styles.metricLabel}>Contacts in CRM</span>
                      <strong style={styles.snapshotValue}>{contacts.length}</strong>
                    </div>
                  </div>
                </article>
              </section>

              <section style={styles.dashboardMainGrid}>
                <article style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>Top companies by open value</h2>
                    <span style={styles.helperText}>Where the biggest pipeline sits</span>
                  </div>
                  <div style={styles.dashboardList}>
                    {topCompaniesByDealValue.length > 0 ? (
                      topCompaniesByDealValue.map((company) => (
                        <div key={company.name} style={styles.rankedRow}>
                          <div>
                            <strong>{company.name}</strong>
                            <p style={styles.rankedMeta}>{company.count} open deal{company.count === 1 ? "" : "s"}</p>
                          </div>
                          <strong>{formatCurrency(company.value)}</strong>
                        </div>
                      ))
                    ) : (
                      <p style={styles.emptyState}>No open pipeline deals yet.</p>
                    )}
                  </div>
                </article>

                <article style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>Owner leaderboard</h2>
                    <span style={styles.helperText}>Open pipeline by owner</span>
                  </div>
                  <div style={styles.dashboardList}>
                    {ownerLeaderboard.length > 0 ? (
                      ownerLeaderboard.map((owner) => (
                        <div key={owner.owner} style={styles.rankedRow}>
                          <div>
                            <strong>{owner.owner}</strong>
                            <p style={styles.rankedMeta}>{owner.count} active deal{owner.count === 1 ? "" : "s"}</p>
                          </div>
                          <strong>{formatCurrency(owner.value)}</strong>
                        </div>
                      ))
                    ) : (
                      <p style={styles.emptyState}>No owners are assigned to active deals yet.</p>
                    )}
                  </div>
                </article>
              </section>
            </>
          ) : null}

          {activeView === "companies" ? (
            <section style={styles.topGrid}>
              <article style={styles.panel}>
                <h2 style={styles.sectionTitle}>Add Company</h2>
                <form style={styles.form} onSubmit={handleCreateCompany}>
                  <label style={styles.label}>
                    Company name
                    <input name="name" value={companyForm.name} onChange={handleCompanyFormChange} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    Industry
                    <input name="industry" value={companyForm.industry} onChange={handleCompanyFormChange} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    Location
                    <input name="location" value={companyForm.location} onChange={handleCompanyFormChange} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    Work phone
                    <input name="work_phone" value={companyForm.work_phone} onChange={handleCompanyFormChange} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    Assignee
                    <input name="assignee" value={companyForm.assignee} onChange={handleCompanyFormChange} style={styles.input} />
                  </label>
                  <button type="submit" style={styles.buttonPrimary}>Add Company</button>
                </form>
              </article>
              <article style={styles.panel}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Companies</h2>
                  <input
                    placeholder="Search companies"
                    value={companySearch}
                    onChange={(event) => setCompanySearch(event.target.value)}
                    style={styles.searchInput}
                  />
                </div>
                <div style={styles.recordGrid}>
                  <div style={styles.listLarge}>
                    {filteredCompanies.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => setSelectedCompanyId(company.id)}
                        style={{
                          ...styles.listButton,
                          ...(String(selectedCompanyId) === String(company.id)
                            ? styles.listButtonActive
                            : {})
                        }}
                      >
                        <strong>{company.name}</strong>
                        <span>{company.industry || "No industry yet"}</span>
                        <span>{company.location || "No location yet"}</span>
                      </button>
                    ))}
                  </div>
                  <aside style={styles.detailCard}>
                    <h3 style={styles.detailTitle}>Company details</h3>
                    {selectedCompany ? (
                      <>
                        <p style={styles.detailLine}><strong>Name:</strong> {selectedCompany.name}</p>
                        <p style={styles.detailLine}><strong>Industry:</strong> {selectedCompany.industry || "No industry yet"}</p>
                        <p style={styles.detailLine}><strong>Location:</strong> {selectedCompany.location || "No location yet"}</p>
                        <p style={styles.detailLine}><strong>Phone:</strong> {selectedCompany.work_phone || "No phone yet"}</p>
                        <p style={styles.detailLine}><strong>Assignee:</strong> {selectedCompany.assignee || "No assignee yet"}</p>

                        <div style={styles.detailSection}>
                          <h4 style={styles.detailSubheading}>Linked contacts</h4>
                          {selectedCompanyContacts.length > 0 ? (
                            <div style={styles.detailStack}>
                              {selectedCompanyContacts.map((contact) => (
                                <div key={contact.id} style={styles.linkedRecord}>
                                  <strong>{contact.person_name || contact.company_name}</strong>
                                  <span>{contact.email || contact.display_phone || "No email or phone yet"}</span>
                                  <span>{contact.title || "No title yet"}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={styles.emptyState}>
                              No linked contact has been imported for this company yet.
                            </p>
                          )}
                        </div>

                        <div style={styles.detailSection}>
                          <h4 style={styles.detailSubheading}>Active deals</h4>
                          {selectedCompanyDeals.length > 0 ? (
                            <div style={styles.detailStack}>
                              {selectedCompanyDeals.slice(0, 5).map((deal) => (
                                <div key={deal.id} style={styles.linkedRecord}>
                                  <strong>{deal.deal_name}</strong>
                                  <span>{deal.stage}</span>
                                  <span>${Number(deal.deal_value || 0).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={styles.emptyState}>No active deals are linked to this company yet.</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <p style={styles.emptyState}>Select a company to see linked contacts and deals.</p>
                    )}
                  </aside>
                </div>
              </article>
            </section>
          ) : null}

          {activeView === "leads-inbox" ? (
            <section style={styles.topGrid}>
              <article style={styles.panel}>
                <h2 style={styles.sectionTitle}>Add Lead</h2>
                <p style={styles.panelIntro}>
                  New opportunities start here before they enter the live pipeline.
                </p>
                <form style={styles.form} onSubmit={handleCreateLead}>
                  <label style={styles.label}>
                    Company
                    <input
                      name="company_name"
                      value={leadForm.company_name}
                      onChange={handleLeadFormChange}
                      style={styles.input}
                      placeholder="Enter the company name"
                    />
                  </label>
                  <label style={styles.label}>
                    Contact name
                    <input
                      name="contact_name"
                      value={leadForm.contact_name}
                      onChange={handleLeadFormChange}
                      style={styles.input}
                      placeholder="Enter the contact name"
                    />
                  </label>
                  <div style={styles.twoCol}>
                    <label style={styles.label}>
                      Contact email
                      <input
                        name="contact_email"
                        value={leadForm.contact_email}
                        onChange={handleLeadFormChange}
                        style={styles.input}
                        placeholder="Enter the contact email"
                      />
                    </label>
                    <label style={styles.label}>
                      Contact phone
                      <input
                        name="contact_phone"
                        value={leadForm.contact_phone}
                        onChange={handleLeadFormChange}
                        style={styles.input}
                        placeholder="Enter the contact phone"
                      />
                    </label>
                  </div>
                  <label style={styles.label}>
                    Lead title
                    <input name="deal_name" value={leadForm.deal_name} onChange={handleLeadFormChange} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    Next step
                    <input name="next_step" value={leadForm.next_step} onChange={handleLeadFormChange} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    Owner
                    <input name="owner" value={leadForm.owner} onChange={handleLeadFormChange} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    Notes
                    <textarea name="notes" value={leadForm.notes} onChange={handleLeadFormChange} style={styles.textarea} />
                  </label>
                  <button type="submit" style={styles.buttonPrimary}>Add Lead To Inbox</button>
                </form>
              </article>

              <article style={styles.panel}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Inbox Leads</h2>
                  <span style={styles.helperText}>
                    Promote these into the pipeline only when they are ready.
                  </span>
                </div>
                <div style={styles.listLarge}>
                  {leadsInboxDeals.map((lead) => (
                    <div key={lead.id} style={styles.inboxLeadCard}>
                      <div style={styles.inboxLeadTop}>
                        <div style={styles.inboxLeadMeta}>
                          <strong>{lead.deal_name}</strong>
                          <span>{lead.company_name || "No company linked"}</span>
                          <span>{lead.contact_name || "No contact linked"}</span>
                        </div>
                        <div style={styles.inboxLeadActions}>
                          <button type="button" style={styles.buttonSecondary} onClick={() => openDealEditor(lead)}>
                            Edit
                          </button>
                          <button type="button" style={styles.buttonPrimary} onClick={() => handlePromoteLead(lead)}>
                            Add To Pipeline
                          </button>
                        </div>
                      </div>
                      <p style={styles.inboxLeadNote}>
                        <strong>Next step:</strong> {lead.next_step || "No next step yet"}
                      </p>
                    </div>
                  ))}
                  {leadsInboxDeals.length === 0 ? (
                    <p style={styles.emptyState}>No leads are waiting in the inbox yet.</p>
                  ) : null}
                </div>
              </article>
            </section>
          ) : null}

          {activeView === "opportunity-reference" ? (
            <section style={styles.topGrid}>
              <article style={styles.panel}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Opportunity Reference</h2>
                  <span style={styles.helperText}>
                    Industries sorted from highest to lowest opportunity score.
                  </span>
                </div>
                <div style={styles.listLarge}>
                  {qualifiedReferenceItems.map((deal) => (
                    <div key={deal.id} style={styles.referenceItem}>
                      <strong>{deal.reference_name}</strong>
                      <span>Industry Reference</span>
                      <span>Opportunity score: {deal.reference_score}%</span>
                    </div>
                  ))}
                  {qualifiedReferenceItems.length === 0 ? (
                    <p style={styles.emptyState}>No opportunity reference items yet.</p>
                  ) : null}
                </div>
              </article>
            </section>
          ) : null}

          {activeView === "contacts" ? (
            <section style={styles.topGrid}>
              <article style={styles.panel}>
                <h2 style={styles.sectionTitle}>Add Contact</h2>
                <form style={styles.form} onSubmit={handleCreateContact}>
                  <label style={styles.label}>
                    Company
                    <select
                      name="company_id"
                      value={contactForm.company_id}
                      onChange={handleContactFormChange}
                      style={styles.input}
                    >
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.label}>
                    First name
                    <input name="first_name" value={contactForm.first_name} onChange={handleContactFormChange} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    Last name
                    <input name="last_name" value={contactForm.last_name} onChange={handleContactFormChange} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    Email
                    <input name="email" type="email" value={contactForm.email} onChange={handleContactFormChange} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    Phone
                    <input name="phone" value={contactForm.phone} onChange={handleContactFormChange} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    Title
                    <input name="title" value={contactForm.title} onChange={handleContactFormChange} style={styles.input} />
                  </label>
                  <button type="submit" style={styles.buttonPrimary}>Add Contact</button>
                </form>
              </article>
              <article style={styles.panel}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Contacts</h2>
                  <input
                    placeholder="Search contacts"
                    value={contactSearch}
                    onChange={(event) => setContactSearch(event.target.value)}
                    style={styles.searchInput}
                  />
                </div>
                <div style={styles.recordGrid}>
                  <div style={styles.listLarge}>
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => openContactEditor(contact)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        openContextMenu(event, "contact", contact);
                      }}
                      style={{
                        ...styles.listButton,
                        ...(String(selectedContactId) === String(contact.id)
                          ? styles.listButtonActive
                          : {})
                      }}
                    >
                      <strong>{contact.primary_label}</strong>
                      <span>{contact.secondary_label}</span>
                      <span>{contact.tertiary_label}</span>
                    </button>
                  ))}
                  </div>
                  <aside style={styles.detailCard}>
                    <h3 style={styles.detailTitle}>Contact details</h3>
                    {selectedContact ? (
                      <>
                        <p style={styles.detailLine}><strong>Company:</strong> {selectedContact.company_name}</p>
                        <p style={styles.detailLine}><strong>Contact person:</strong> {selectedContact.person_name || "No named contact yet"}</p>
                        <p style={styles.detailLine}><strong>Phone:</strong> {selectedContact.display_phone || "No phone yet"}</p>
                        <p style={styles.detailLine}><strong>Email:</strong> {selectedContact.email || "No email yet"}</p>
                        <p style={styles.detailLine}><strong>Title:</strong> {selectedContact.title || "No title yet"}</p>
                        <p style={styles.detailLine}><strong>Tag:</strong> {selectedContact.tag || "No tag yet"}</p>
                        <div style={styles.detailActions}>
                          <button type="button" style={styles.buttonPrimary} onClick={() => openContactEditor(selectedContact)}>
                            Edit Contact
                          </button>
                          <button type="button" style={styles.buttonDanger} onClick={() => handleDeleteContact(selectedContact.id)}>
                            Delete Contact
                          </button>
                        </div>
                      </>
                    ) : (
                      <p style={styles.emptyState}>Select a contact to see details.</p>
                    )}
                  </aside>
                </div>
              </article>
            </section>
          ) : null}

          {activeView === "deals" ? (
            <section style={styles.topGrid}>
              <article style={styles.panel}>
                <h2 style={styles.sectionTitle}>Add Deal</h2>
                <form style={styles.form} onSubmit={handleCreateDeal}>
                  <label style={styles.label}>
                    Company
                    <select name="company_id" value={dealForm.company_id} onChange={handleDealFormChange} style={styles.input}>
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.label}>
                    Contact
                    <select name="contact_id" value={dealForm.contact_id} onChange={handleDealFormChange} style={styles.input}>
                      <option value="">Select a contact</option>
                      {contactsForSelectedCompany.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {buildContactOptionLabel(
                            contact,
                            companiesById.get(String(contact.company_id))?.name
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.label}>
                    Deal name
                    <input name="deal_name" value={dealForm.deal_name} onChange={handleDealFormChange} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    Next step
                    <input name="next_step" value={dealForm.next_step} onChange={handleDealFormChange} style={styles.input} />
                  </label>
                  <button type="submit" style={styles.buttonPrimary}>Add Deal</button>
                </form>
              </article>
              <article style={styles.panel}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Deals</h2>
                  <div style={styles.inlineFilters}>
                    <input placeholder="Search deals" value={dealSearch} onChange={(event) => setDealSearch(event.target.value)} style={styles.searchInput} />
                    <select value={dealStageFilter} onChange={(event) => setDealStageFilter(event.target.value)} style={styles.searchInput}>
                      <option value="All">All stages</option>
                      <option value="Lead">Lead</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Proposal">Proposal</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                </div>
                <div style={styles.recordGrid}>
                  <div style={styles.listLarge}>
                  {filteredDeals.map((deal) => (
                    <button
                      key={deal.id}
                      type="button"
                      onClick={() => openDealEditor(deal)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        openContextMenu(event, "deal", deal);
                      }}
                      style={{
                        ...styles.listButton,
                        ...(String(selectedDealId) === String(deal.id)
                          ? styles.listButtonActive
                          : {})
                      }}
                    >
                      <strong>{deal.deal_name}</strong>
                      <span>{deal.company_name || "No company linked"}</span>
                      <span>{deal.stage} • ${Number(deal.deal_value || 0).toLocaleString()}</span>
                    </button>
                  ))}
                  </div>
                  <aside style={styles.detailCard}>
                    <h3 style={styles.detailTitle}>Deal details</h3>
                    {selectedDeal ? (
                      <>
                        <p style={styles.detailLine}><strong>Name:</strong> {selectedDeal.deal_name}</p>
                        <p style={styles.detailLine}><strong>Company:</strong> {selectedDeal.company_name || "No company linked"}</p>
                        <p style={styles.detailLine}><strong>Contact:</strong> {selectedDeal.contact_name || "No contact linked"}</p>
                        <p style={styles.detailLine}><strong>Stage:</strong> {selectedDeal.stage}</p>
                        <p style={styles.detailLine}><strong>Value:</strong> ${Number(selectedDeal.deal_value || 0).toLocaleString()}</p>
                        <p style={styles.detailLine}><strong>Next step:</strong> {selectedDeal.next_step || "No next step yet"}</p>
                        <div style={styles.detailActions}>
                          <button type="button" style={styles.buttonPrimary} onClick={() => openDealEditor(selectedDeal)}>
                            Edit Deal
                          </button>
                          <button type="button" style={styles.buttonDanger} onClick={() => handleDeleteDeal(selectedDeal.id)}>
                            Delete Deal
                          </button>
                        </div>
                      </>
                    ) : (
                      <p style={styles.emptyState}>Select a deal to see details.</p>
                    )}
                  </aside>
                </div>
              </article>
            </section>
          ) : null}

          {activeView === "pipeline" ? (
            <>
              <section style={styles.middleGrid}>
                <article style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>Contacts</h2>
                    <input
                      placeholder="Search contacts"
                      value={contactSearch}
                      onChange={(event) => setContactSearch(event.target.value)}
                      style={styles.searchInput}
                    />
                  </div>
                  <div style={styles.recordGrid}>
                    <div style={styles.list}>
                    {filteredContacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => openContactEditor(contact)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          openContextMenu(event, "contact", contact);
                        }}
                        style={{
                          ...styles.listButton,
                          ...(String(selectedContactId) === String(contact.id)
                            ? styles.listButtonActive
                            : {})
                        }}
                      >
                        <strong>{contact.primary_label}</strong>
                        <span>{contact.secondary_label}</span>
                        <span>{contact.tertiary_label}</span>
                      </button>
                    ))}
                    {filteredContacts.length === 0 ? (
                      <p style={styles.emptyState}>No contacts match your search.</p>
                    ) : null}
                    </div>
                    <aside style={styles.detailCard}>
                      <h3 style={styles.detailTitle}>Contact details</h3>
                      {selectedContact ? (
                        <>
                          <p style={styles.detailLine}><strong>Company:</strong> {selectedContact.company_name}</p>
                          <p style={styles.detailLine}><strong>Contact person:</strong> {selectedContact.person_name || "No named contact yet"}</p>
                          <p style={styles.detailLine}><strong>Phone:</strong> {selectedContact.display_phone || "No phone yet"}</p>
                          <p style={styles.detailLine}><strong>Email:</strong> {selectedContact.email || "No email yet"}</p>
                          <p style={styles.detailLine}><strong>Title:</strong> {selectedContact.title || "No title yet"}</p>
                          <div style={styles.detailActions}>
                            <button type="button" style={styles.buttonPrimary} onClick={() => openContactEditor(selectedContact)}>
                              Edit Contact
                            </button>
                            <button type="button" style={styles.buttonDanger} onClick={() => handleDeleteContact(selectedContact.id)}>
                              Delete Contact
                            </button>
                          </div>
                        </>
                      ) : (
                        <p style={styles.emptyState}>Select a contact to see details.</p>
                      )}
                    </aside>
                  </div>
                </article>

                <article style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>Deals</h2>
                    <div style={styles.inlineFilters}>
                      <input
                        placeholder="Search deals"
                        value={dealSearch}
                        onChange={(event) => setDealSearch(event.target.value)}
                        style={styles.searchInput}
                      />
                      <select
                        value={dealStageFilter}
                        onChange={(event) => setDealStageFilter(event.target.value)}
                        style={styles.searchInput}
                      >
                        <option value="All">All stages</option>
                        <option value="Lead">Lead</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>
                  </div>
                  <div style={styles.recordGrid}>
                    <div style={styles.list}>
                    {filteredDeals.map((deal) => (
                      <button
                        key={deal.id}
                        type="button"
                        onClick={() => openDealEditor(deal)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          openContextMenu(event, "deal", deal);
                        }}
                        style={{
                          ...styles.listButton,
                          ...(String(selectedDealId) === String(deal.id)
                            ? styles.listButtonActive
                            : {})
                        }}
                      >
                        <strong>{deal.deal_name}</strong>
                        <span>
                          {deal.stage} • ${Number(deal.deal_value || 0).toLocaleString()}
                        </span>
                        <span>{deal.next_step || "No next step yet"}</span>
                      </button>
                    ))}
                    {filteredDeals.length === 0 ? (
                      <p style={styles.emptyState}>No deals match your search.</p>
                    ) : null}
                    </div>
                    <aside style={styles.detailCard}>
                      <h3 style={styles.detailTitle}>Deal details</h3>
                      {selectedDeal ? (
                        <>
                          <p style={styles.detailLine}><strong>Name:</strong> {selectedDeal.deal_name}</p>
                          <p style={styles.detailLine}><strong>Company:</strong> {selectedDeal.company_name || "No company linked"}</p>
                          <p style={styles.detailLine}><strong>Contact:</strong> {selectedDeal.contact_name || "No contact linked"}</p>
                          <p style={styles.detailLine}><strong>Stage:</strong> {selectedDeal.stage}</p>
                          <p style={styles.detailLine}><strong>Value:</strong> ${Number(selectedDeal.deal_value || 0).toLocaleString()}</p>
                          <p style={styles.detailLine}><strong>Next step:</strong> {selectedDeal.next_step || "No next step yet"}</p>
                          <div style={styles.detailActions}>
                            <button type="button" style={styles.buttonPrimary} onClick={() => openDealEditor(selectedDeal)}>
                              Edit Deal
                            </button>
                            <button type="button" style={styles.buttonDanger} onClick={() => handleDeleteDeal(selectedDeal.id)}>
                              Delete Deal
                            </button>
                          </div>
                        </>
                      ) : (
                        <p style={styles.emptyState}>Select a deal to see details.</p>
                      )}
                    </aside>
                  </div>
                </article>
              </section>

              <section style={styles.boardSection}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Pipeline Board</h2>
                  <span style={styles.helperText}>
                    Drag active deals across the live pipeline. Qualified is now a separate reference list above.
                  </span>
                </div>
                <DealsKanban
                  deals={pipelineDeals.filter((deal) =>
                    dealSearch
                      ? [deal.deal_name, deal.company_name, deal.next_step, deal.owner]
                          .filter(Boolean)
                          .join(" ")
                          .toLowerCase()
                          .includes(dealSearch.toLowerCase())
                      : true
                  )}
                  onDealsChange={handleDealsChange}
                  stages={pipelineStages}
                  onDealClick={openDealEditor}
                  onDealContextMenu={(event, deal) => openContextMenu(event, "deal", deal)}
                />
              </section>
            </>
          ) : null}
        </>
      ) : null}

      {contextMenu ? (
        <>
          <div style={styles.contextBackdrop} onClick={() => setContextMenu(null)} />
          <div
            style={{
              ...styles.contextMenu,
              top: contextMenu.y,
              left: contextMenu.x
            }}
          >
            <button
              type="button"
              style={styles.contextMenuItem}
              onClick={() =>
                contextMenu.type === "contact"
                  ? openContactEditor(contextMenu.record)
                  : openDealEditor(contextMenu.record)
              }
            >
              Edit
            </button>
            <button
              type="button"
              style={{ ...styles.contextMenuItem, ...styles.contextMenuDelete }}
              onClick={() =>
                contextMenu.type === "contact"
                  ? handleDeleteContact(contextMenu.record.id)
                  : handleDeleteDeal(contextMenu.record.id)
              }
            >
              Delete
            </button>
          </div>
        </>
      ) : null}

      {editingContact ? (
        <div style={styles.modalBackdrop} onClick={() => setEditingContact(null)}>
          <div style={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Edit Contact</h2>
            </div>
            <form style={styles.form} onSubmit={handleUpdateContact}>
              <label style={styles.label}>
                Company
                <select
                  name="company_id"
                  value={editingContact.company_id}
                  onChange={handleEditingContactChange}
                  style={styles.input}
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                First name
                <input name="first_name" value={editingContact.first_name} onChange={handleEditingContactChange} style={styles.input} />
              </label>
              <label style={styles.label}>
                Last name
                <input name="last_name" value={editingContact.last_name} onChange={handleEditingContactChange} style={styles.input} />
              </label>
              <label style={styles.label}>
                Email
                <input name="email" value={editingContact.email} onChange={handleEditingContactChange} style={styles.input} />
              </label>
              <label style={styles.label}>
                Title
                <input name="title" value={editingContact.title} onChange={handleEditingContactChange} style={styles.input} />
              </label>
              <label style={styles.label}>
                Phone
                <input name="phone" value={editingContact.phone} onChange={handleEditingContactChange} style={styles.input} />
              </label>
              <label style={styles.label}>
                Notes
                <textarea name="notes" value={editingContact.notes} onChange={handleEditingContactChange} style={styles.textarea} />
              </label>
              <div style={styles.modalActions}>
                <button type="button" style={styles.buttonSecondary} onClick={() => setEditingContact(null)}>
                  Cancel
                </button>
                <button type="submit" style={styles.buttonPrimary}>
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingDeal ? (
        <div style={styles.modalBackdrop} onClick={() => setEditingDeal(null)}>
          <div style={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Edit Deal</h2>
            </div>
            <form style={styles.form} onSubmit={handleUpdateDeal}>
              <label style={styles.label}>
                Company
                <select
                  name="company_id"
                  value={editingDeal.company_id}
                  onChange={handleEditingDealChange}
                  style={styles.input}
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                Contact
                <select
                  name="contact_id"
                  value={editingDeal.contact_id}
                  onChange={handleEditingDealChange}
                  style={styles.input}
                >
                  <option value="">Select a contact</option>
                  {contactsForEditingDeal.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {buildContactOptionLabel(
                        contact,
                        companiesById.get(String(contact.company_id))?.name
                      )}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                Deal name
                <input name="deal_name" value={editingDeal.deal_name} onChange={handleEditingDealChange} style={styles.input} />
              </label>
              <div style={styles.twoCol}>
                <label style={styles.label}>
                  Stage
                  <select name="stage" value={editingDeal.stage} onChange={handleEditingDealChange} style={styles.input}>
                    {["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"].map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={styles.label}>
                  Value
                  <input name="deal_value" type="number" value={editingDeal.deal_value} onChange={handleEditingDealChange} style={styles.input} />
                </label>
              </div>
              <div style={styles.twoCol}>
                <label style={styles.label}>
                  Opportunity %
                  <input name="close_probability" type="number" value={editingDeal.close_probability} onChange={handleEditingDealChange} style={styles.input} />
                </label>
                <label style={styles.label}>
                  Owner
                  <input name="owner" value={editingDeal.owner} onChange={handleEditingDealChange} style={styles.input} />
                </label>
              </div>
              <label style={styles.label}>
                Next step
                <input name="next_step" value={editingDeal.next_step} onChange={handleEditingDealChange} style={styles.input} />
              </label>
              <label style={styles.label}>
                Operational impact
                <textarea name="operational_impact_statement" value={editingDeal.operational_impact_statement} onChange={handleEditingDealChange} style={styles.textarea} />
              </label>
              <label style={styles.label}>
                Financial impact
                <textarea name="financial_impact" value={editingDeal.financial_impact} onChange={handleEditingDealChange} style={styles.textarea} />
              </label>
              <label style={styles.label}>
                Failure mode
                <textarea name="failure_mode" value={editingDeal.failure_mode} onChange={handleEditingDealChange} style={styles.textarea} />
              </label>
              <div style={styles.modalActions}>
                <button type="button" style={styles.buttonSecondary} onClick={() => setEditingDeal(null)}>
                  Cancel
                </button>
                <button type="submit" style={styles.buttonPrimary}>
                  Save Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    background: `linear-gradient(180deg, ${BRAND.primary} 0%, ${BRAND.sandDeep} 100%)`,
    color: "#ffffff"
  },
  header: {
    display: "flex",
    justifyContent: "flex-start",
    gap: "20px",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap"
  },
  tabs: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "18px"
  },
  tabButton: {
    border: "1px solid rgba(255,255,255,0.4)",
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    borderRadius: "999px",
    padding: "10px 16px",
    cursor: "pointer",
    fontFamily: '"Montserrat", "Segoe UI", sans-serif',
    fontWeight: 700
  },
  tabButtonActive: {
    background: "#ffffff",
    color: BRAND.primary,
    borderColor: "#ffffff"
  },
  brandBlock: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    flex: "1 1 640px",
    minWidth: 0
  },
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: "16px",
    padding: "12px 14px",
    color: "#ffffff"
  },
  userMeta: {
    display: "grid",
    gap: "4px"
  },
  userLabel: {
    fontSize: "0.74rem",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#c9d9ea"
  },
  brandText: {
    display: "grid",
    gap: "4px",
    alignContent: "center",
    minWidth: 0,
    maxWidth: "560px"
  },
  logo: {
    width: "214px",
    maxWidth: "30vw",
    height: "auto",
    background: "#ffffff",
    borderRadius: "12px",
    padding: "8px 14px",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.12)"
  },
  eyebrow: {
    margin: 0,
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    color: "#c9d9ea",
    fontFamily: '"Montserrat", "Segoe UI", sans-serif',
    fontWeight: 700
  },
  title: {
    margin: 0,
    fontSize: "2.45rem",
    fontFamily: '"League Spartan", "Arial Black", sans-serif',
    letterSpacing: "0.02em",
    color: "#ffffff",
    lineHeight: 0.95
  },
  subhead: {
    margin: 0,
    fontFamily: '"Montserrat", "Segoe UI", sans-serif',
    color: "#e8f0f8",
    fontSize: "0.98rem",
    lineHeight: 1.35,
    maxWidth: "42ch"
  },
  status: {
    margin: "0 0 18px",
    color: "#dbe8f5",
    fontFamily: '"Montserrat", "Segoe UI", sans-serif',
    fontSize: "0.9rem",
    textAlign: "right"
  },
  message: {
    color: "#ffffff"
  },
  error: {
    color: "#ffe0e0",
    fontWeight: 600
  },
  success: {
    color: "#d9efff",
    fontWeight: 600
  },
  topGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
    marginTop: "24px"
  },
  dashboardHeroGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginTop: "20px"
  },
  dashboardMainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
    marginTop: "20px"
  },
  middleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
    marginTop: "20px"
  },
  panel: {
    background: BRAND.card,
    border: `1px solid ${BRAND.border}`,
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 10px 24px rgba(49, 38, 23, 0.06)",
    color: BRAND.ink
  },
  metricCard: {
    background: "#ffffff",
    border: `1px solid ${BRAND.border}`,
    borderRadius: "18px",
    padding: "18px 20px",
    boxShadow: "0 10px 24px rgba(49, 38, 23, 0.06)",
    color: BRAND.ink,
    display: "grid",
    gap: "8px"
  },
  metricLabel: {
    fontSize: "0.86rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: BRAND.muted,
    fontWeight: 700
  },
  metricValue: {
    fontSize: "2rem",
    lineHeight: 1,
    fontFamily: '"League Spartan", "Arial Black", sans-serif',
    color: BRAND.primary
  },
  metricSubtext: {
    color: BRAND.muted,
    fontSize: "0.92rem",
    lineHeight: 1.4
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    marginBottom: "14px"
  },
  sectionTitle: {
    margin: 0,
    fontSize: "1.15rem",
    fontFamily: '"League Spartan", "Arial Black", sans-serif',
    letterSpacing: "0.02em",
    color: BRAND.ink
  },
  panelIntro: {
    margin: "0 0 14px",
    color: BRAND.muted,
    lineHeight: 1.45
  },
  form: {
    display: "grid",
    gap: "12px"
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px"
  },
  label: {
    display: "grid",
    gap: "6px",
    fontSize: "0.92rem",
    fontFamily: '"Montserrat", "Segoe UI", sans-serif',
    color: BRAND.muted
  },
  input: {
    width: "100%",
    borderRadius: "10px",
    border: `1px solid ${BRAND.border}`,
    padding: "10px 12px",
    fontSize: "0.95rem",
    background: "#fff"
  },
  textarea: {
    width: "100%",
    minHeight: "74px",
    resize: "vertical",
    borderRadius: "10px",
    border: `1px solid ${BRAND.border}`,
    padding: "10px 12px",
    fontSize: "0.95rem",
    background: "#fff"
  },
  buttonPrimary: {
    border: "none",
    borderRadius: "999px",
    padding: "12px 18px",
    background: BRAND.primary,
    color: "#fff",
    fontSize: "0.96rem",
    fontFamily: '"Montserrat", "Segoe UI", sans-serif',
    fontWeight: 700,
    cursor: "pointer"
  },
  buttonSecondary: {
    border: `1px solid ${BRAND.border}`,
    borderRadius: "999px",
    padding: "12px 18px",
    background: "#ffffff",
    color: BRAND.ink,
    fontSize: "0.96rem",
    fontFamily: '"Montserrat", "Segoe UI", sans-serif',
    fontWeight: 700,
    cursor: "pointer"
  },
  buttonDanger: {
    border: "none",
    borderRadius: "999px",
    padding: "12px 18px",
    background: BRAND.danger,
    color: "#fff",
    fontSize: "0.96rem",
    fontFamily: '"Montserrat", "Segoe UI", sans-serif',
    fontWeight: 700,
    cursor: "pointer"
  },
  searchInput: {
    minWidth: "170px",
    borderRadius: "999px",
    border: `1px solid ${BRAND.border}`,
    padding: "10px 14px",
    fontSize: "0.92rem",
    background: "#fff"
  },
  inlineFilters: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  list: {
    display: "grid",
    gap: "10px",
    maxHeight: "320px",
    overflowY: "auto"
  },
  listLarge: {
    display: "grid",
    gap: "10px",
    maxHeight: "640px",
    overflowY: "auto"
  },
  recordGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(260px, 1fr)",
    gap: "16px",
    alignItems: "start"
  },
  listItem: {
    display: "grid",
    gap: "4px",
    padding: "12px",
    borderRadius: "12px",
    border: `1px solid ${BRAND.border}`,
    background: BRAND.primarySoft,
    color: BRAND.ink
  },
  listButton: {
    display: "grid",
    gap: "4px",
    padding: "12px",
    borderRadius: "12px",
    border: `1px solid ${BRAND.border}`,
    background: BRAND.primarySoft,
    color: BRAND.ink,
    textAlign: "left",
    cursor: "pointer",
    font: "inherit"
  },
  listButtonActive: {
    border: `2px solid ${BRAND.primary}`,
    background: "#ffffff",
    boxShadow: "0 8px 18px rgba(0, 70, 133, 0.12)"
  },
  detailCard: {
    border: `1px solid ${BRAND.border}`,
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px",
    minHeight: "180px"
  },
  detailTitle: {
    margin: "0 0 12px",
    fontSize: "1rem",
    fontFamily: '"League Spartan", "Arial Black", sans-serif',
    color: BRAND.primary
  },
  detailLine: {
    margin: "0 0 10px",
    color: BRAND.ink,
    lineHeight: 1.45,
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  detailSection: {
    marginTop: "16px",
    paddingTop: "14px",
    borderTop: `1px solid ${BRAND.border}`
  },
  detailSubheading: {
    margin: "0 0 10px",
    fontSize: "0.98rem",
    fontFamily: '"League Spartan", "Arial Black", sans-serif',
    color: BRAND.primary
  },
  detailStack: {
    display: "grid",
    gap: "10px"
  },
  linkedRecord: {
    display: "grid",
    gap: "4px",
    padding: "12px",
    borderRadius: "12px",
    background: "#f7fbff",
    border: `1px solid ${BRAND.border}`,
    color: BRAND.ink
  },
  detailActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "12px"
  },
  referenceItem: {
    display: "grid",
    gap: "6px",
    padding: "14px",
    borderRadius: "14px",
    border: `1px solid ${BRAND.border}`,
    background: "#f7fbff",
    color: BRAND.ink
  },
  inboxLeadCard: {
    display: "grid",
    gap: "12px",
    padding: "14px",
    borderRadius: "14px",
    border: `1px solid ${BRAND.border}`,
    background: "#f7fbff",
    color: BRAND.ink
  },
  inboxLeadTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    alignItems: "flex-start",
    flexWrap: "wrap"
  },
  inboxLeadMeta: {
    display: "grid",
    gap: "5px"
  },
  inboxLeadActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  inboxLeadNote: {
    margin: 0,
    color: BRAND.ink,
    lineHeight: 1.45
  },
  emptyState: {
    color: BRAND.muted
  },
  boardSection: {
    marginTop: "24px"
  },
  helperText: {
    color: BRAND.muted,
    fontSize: "0.9rem"
  },
  dashboardList: {
    display: "grid",
    gap: "12px"
  },
  stageRow: {
    display: "grid",
    gap: "8px",
    padding: "10px 0",
    borderBottom: `1px solid ${BRAND.border}`
  },
  stageRowHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    color: BRAND.ink
  },
  stageBarTrack: {
    width: "100%",
    height: "10px",
    borderRadius: "999px",
    background: "#e7edf5",
    overflow: "hidden"
  },
  stageBarFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #0d4f90 0%, #2f79bf 100%)"
  },
  stageRowValue: {
    color: BRAND.muted,
    fontSize: "0.92rem"
  },
  snapshotCard: {
    display: "grid",
    gap: "6px",
    padding: "14px",
    borderRadius: "14px",
    background: "#f7fbff",
    border: `1px solid ${BRAND.border}`
  },
  snapshotValue: {
    fontSize: "1.5rem",
    lineHeight: 1,
    fontFamily: '"League Spartan", "Arial Black", sans-serif',
    color: BRAND.primary
  },
  rankedRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: `1px solid ${BRAND.border}`
  },
  rankedMeta: {
    margin: "4px 0 0",
    color: BRAND.muted,
    fontSize: "0.9rem"
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    zIndex: 2000
  },
  modalCard: {
    width: "min(720px, 100%)",
    maxHeight: "85vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 24px 60px rgba(0,0,0,0.22)"
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "8px"
  },
  contextBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 2100
  },
  contextMenu: {
    position: "fixed",
    minWidth: "160px",
    background: "#ffffff",
    border: `1px solid ${BRAND.border}`,
    borderRadius: "12px",
    boxShadow: "0 14px 30px rgba(0,0,0,0.18)",
    padding: "6px",
    zIndex: 2200
  },
  contextMenuItem: {
    width: "100%",
    border: "none",
    background: "transparent",
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: "8px",
    color: BRAND.ink,
    font: 'inherit',
    cursor: "pointer"
  },
  contextMenuDelete: {
    color: BRAND.danger
  }
};
