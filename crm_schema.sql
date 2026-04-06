-- CRM schema adapted from the workbook tabs:
-- Companies, Contacts, Pipeline, and Opportunities.
-- SQL dialect: PostgreSQL-style identity columns and constraints.

CREATE TABLE companies (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(150),
    location VARCHAR(255),
    work_phone VARCHAR(50),
    hvac_score SMALLINT CHECK (hvac_score BETWEEN 1 AND 10),
    site_count INTEGER CHECK (site_count >= 0),
    priority VARCHAR(20) CHECK (priority IN ('Low', 'Medium', 'High')),
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Prospect')),
    primary_contact_name VARCHAR(255),
    primary_contact_title VARCHAR(255),
    assignee VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contacts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id BIGINT,
    tag VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    last_contacted DATE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_contacts_email UNIQUE (email),
    CONSTRAINT fk_contacts_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
        ON DELETE SET NULL
);

CREATE TABLE deals (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id BIGINT,
    contact_id BIGINT,
    deal_name VARCHAR(255) NOT NULL,
    stage VARCHAR(50) NOT NULL,
    deal_value DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (deal_value >= 0),
    close_probability DECIMAL(5, 2) CHECK (close_probability BETWEEN 0 AND 100),
    operational_impact_statement TEXT,
    financial_impact TEXT,
    failure_mode TEXT,
    expected_close_date DATE,
    last_activity VARCHAR(255),
    next_step TEXT NOT NULL,
    owner VARCHAR(100),
    status VARCHAR(20) CHECK (status IN ('Open', 'Won', 'Lost', 'On Hold')),
    loss_reason VARCHAR(255),
    priority VARCHAR(20) CHECK (priority IN ('Low', 'Medium', 'High')),
    source VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_deals_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_deals_contact
        FOREIGN KEY (contact_id) REFERENCES contacts(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_deals_stage
        CHECK (stage IN ('Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')),
    CONSTRAINT chk_deals_next_step_not_blank
        CHECK (LENGTH(TRIM(next_step)) > 0)
);

CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_deals_company_id ON deals(company_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_stage ON deals(stage);

-- Optional helper view for a denormalized pipeline-style CRM report.
CREATE VIEW crm_pipeline_overview AS
SELECT
    d.id AS deal_id,
    d.deal_name,
    d.stage,
    d.deal_value,
    d.close_probability,
    d.expected_close_date,
    d.owner,
    d.status AS deal_status,
    c.name AS company_name,
    CONCAT(ct.first_name, ' ', ct.last_name) AS contact_name,
    ct.email AS contact_email
FROM deals d
LEFT JOIN companies c ON c.id = d.company_id
LEFT JOIN contacts ct ON ct.id = d.contact_id;
