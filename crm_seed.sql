-- Sample seed data for the CRM schema.
-- This demonstrates how workbook rows map into the normalized tables.

INSERT INTO companies (
    name,
    industry,
    location,
    work_phone,
    hvac_score,
    site_count,
    priority,
    status,
    primary_contact_name,
    assignee,
    notes
) VALUES (
    'Save-On-Foods',
    'Supermarket',
    'British Columbia',
    NULL,
    NULL,
    NULL,
    'High',
    'Active',
    'Stathie Sgouraditis',
    'Andrew',
    NULL
);

INSERT INTO contacts (
    company_id,
    tag,
    first_name,
    last_name,
    title,
    email,
    phone,
    linkedin_url,
    last_contacted,
    notes
) VALUES (
    (SELECT id FROM companies WHERE name = 'Save-On-Foods'),
    'Contacted',
    'Stathie',
    'Sgouraditis',
    NULL,
    'stathie.sgouraditis@saveonfoods.example',
    NULL,
    NULL,
    NULL,
    NULL
);

INSERT INTO deals (
    company_id,
    contact_id,
    deal_name,
    stage,
    deal_value,
    close_probability,
    operational_impact_statement,
    financial_impact,
    failure_mode,
    expected_close_date,
    last_activity,
    next_step,
    owner,
    status,
    loss_reason,
    priority,
    source,
    description
) VALUES (
    (SELECT id FROM companies WHERE name = 'Save-On-Foods'),
    (
        SELECT ct.id
        FROM contacts ct
        JOIN companies c ON c.id = ct.company_id
        WHERE c.name = 'Save-On-Foods'
          AND ct.email = 'stathie.sgouraditis@saveonfoods.example'
    ),
    'Save-On-Foods',
    'Qualified',
    100000.00,
    65.00,
    'Protect temperature-sensitive storage and handling continuity across multiple operating sites.',
    'Reduces spoilage risk, preserves inventory value, and lowers unplanned operational cost exposure.',
    'Cold chain interruption causing product degradation, compliance exposure, or delivery disruption.',
    NULL,
    'Canada',
    'Schedule discovery call and document operational pain points.',
    'Andrew',
    'Open',
    NULL,
    'High',
    'Workbook Import',
    'Imported from the original CRM workbook pipeline/opportunity tabs.'
);
