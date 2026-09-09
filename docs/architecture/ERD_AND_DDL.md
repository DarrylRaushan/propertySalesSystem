# Comprehensive Entity Relationship Diagram (ERD) & DDL Specification

## 1. Visual Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ PROPERTIES : "manages/lists"
    USERS ||--o{ LEADS : "assigned_to"
    USERS ||--o{ CUSTOMERS : "manages"
    USERS ||--o{ CUSTOMER_ACCOUNTS : "designated_concierge"
    USERS ||--o{ PROPERTY_VIEWINGS : "hosts_tour"
    USERS ||--o{ PIPELINE_STAGES : "scoped_to"
    USERS ||--o{ SALES_TREND : "records"
    USERS ||--o{ ENQUIRY_SOURCES : "tracks"
    USERS ||--o{ FOLLOW_UP_HEALTH : "monitors"

    CUSTOMER_ACCOUNTS ||--o{ CUSTOMER_SHORTLISTS : "saves"
    CUSTOMER_ACCOUNTS ||--o{ PROPERTY_VIEWINGS : "books"
    CUSTOMER_ACCOUNTS ||--o{ CONVERSATIONS : "owns"

    PROPERTIES ||--o{ CUSTOMER_SHORTLISTS : "bookmarked_in"
    PROPERTIES ||--o{ PROPERTY_VIEWINGS : "subject_of"

    LEADS ||--o| CUSTOMERS : "converts_into"

    CONVERSATIONS ||--o{ CONVERSATION_MESSAGES : "contains"

    USERS {
        integer id PK
        string openId UK
        string agentCode UK
        string name
        string email
        string phone
        string role
        string specialization
        string loginMethod
        timestamp createdAt
        timestamp updatedAt
        timestamp lastSignedIn
    }

    PROPERTIES {
        integer id PK
        string title
        string developer
        string location
        string type
        string status
        real price
        integer beds
        integer baths
        string size
        string description
        text features
        string imageUrl
        boolean isActive
        string agentId FK
        string badge
        string rentalYield
        text collection
        timestamp createdAt
        timestamp updatedAt
    }

    LEADS {
        integer id PK
        string name
        string initials
        string accent
        string location
        string segment
        string priority
        real probability
        real value
        string property
        string action
        string agentId FK
        string phone
        string email
        text notes
        timestamp lastContacted
        timestamp createdAt
        timestamp updatedAt
    }

    CUSTOMERS {
        integer id PK
        string name
        string email
        string phone
        string segment
        real totalPurchased
        integer unitsOwned
        boolean isVip
        text notes
        string agentId FK
        integer leadId FK
        timestamp createdAt
        timestamp updatedAt
    }

    CUSTOMER_ACCOUNTS {
        integer id PK
        string name
        string email UK
        string password
        string phone
        string avatarInitials
        string segment
        string budget
        string preferredLocation
        text preferredTypes
        integer minBeds
        string investmentGoal
        text preferredFeatures
        string assignedAgentId FK
        timestamp createdAt
    }

    CUSTOMER_SHORTLISTS {
        integer id PK
        integer customerAccountId FK
        integer propertyId FK
        timestamp createdAt
    }

    PROPERTY_VIEWINGS {
        integer id PK
        integer customerAccountId FK
        integer propertyId FK
        string agentId FK
        string propertyTitle
        string propertyLocation
        real propertyPrice
        string propertyImage
        string agentName
        string agentPhone
        string date
        string timeSlot
        string status
        text notes
        timestamp createdAt
    }

    CONVERSATIONS {
        string id PK
        integer userId FK
        string mode
        string title
        timestamp createdAt
        timestamp updatedAt
    }

    CONVERSATION_MESSAGES {
        integer id PK
        string conversationId FK
        string role
        text content
        timestamp timestamp
    }

    PIPELINE_STAGES {
        integer id PK
        string agentId FK
        string name
        integer count
        real conversionRate
        string period
        timestamp createdAt
        timestamp updatedAt
    }

    SALES_TREND {
        integer id PK
        string agentId FK
        string month
        real value
        integer year
        timestamp createdAt
    }

    ENQUIRY_SOURCES {
        integer id PK
        string agentId FK
        string source
        integer count
        real percentage
        string period
        timestamp createdAt
    }

    FOLLOW_UP_HEALTH {
        integer id PK
        string agentId FK
        string metric
        real value
        string label
        string sub
        string period
        timestamp createdAt
        timestamp updatedAt
    }
```

---

## 2. Complete SQL DDL Schema

```sql
-- =============================================================================
-- 1. USERS & AGENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    open_id TEXT NOT NULL UNIQUE,
    agent_code TEXT UNIQUE,
    name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'agent', -- 'agent', 'admin', 'user'
    specialization TEXT,
    login_method TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_signed_in TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 2. PROPERTIES CATALOG
-- =============================================================================
CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    developer TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    price REAL NOT NULL,
    beds INTEGER NOT NULL DEFAULT 0,
    baths INTEGER NOT NULL DEFAULT 0,
    size TEXT NOT NULL,
    description TEXT,
    features TEXT, -- JSON array
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    agent_id TEXT REFERENCES users(agent_code) ON DELETE SET NULL,
    badge TEXT,
    rental_yield TEXT,
    collection TEXT, -- JSON array
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 3. SALES LEADS
-- =============================================================================
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    accent TEXT NOT NULL,
    location TEXT NOT NULL,
    segment TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium', -- 'High', 'Medium', 'Low'
    probability REAL NOT NULL,
    value REAL NOT NULL,
    property TEXT NOT NULL,
    action TEXT NOT NULL,
    agent_id TEXT NOT NULL DEFAULT 'hannah' REFERENCES users(agent_code) ON DELETE CASCADE,
    phone TEXT,
    email TEXT,
    notes TEXT,
    last_contacted TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 4. CONFIRMED CUSTOMERS (CRM)
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    segment TEXT NOT NULL,
    total_purchased REAL NOT NULL DEFAULT 0,
    units_owned INTEGER NOT NULL DEFAULT 0,
    is_vip BOOLEAN NOT NULL DEFAULT 0,
    notes TEXT,
    agent_id TEXT REFERENCES users(agent_code) ON DELETE SET NULL,
    lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 5. CUSTOMER ACCOUNTS (SELF-SERVICE BUYER PROFILES & AI PREFERENCES)
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone TEXT,
    avatar_initials TEXT NOT NULL,
    segment TEXT NOT NULL,
    budget TEXT,
    preferred_location TEXT,
    preferred_types TEXT, -- e.g. "Condominium,Penthouse"
    min_beds INTEGER DEFAULT 0,
    investment_goal TEXT, -- e.g. "High Rental Yield", "Capital Appreciation"
    preferred_features TEXT, -- e.g. "Private Lift,Sky Pool"
    assigned_agent_id TEXT REFERENCES users(agent_code) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 6. CUSTOMER SHORTLISTS (M:N JOIN TABLE)
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_shortlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_account_id INTEGER NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_account_id, property_id)
);

-- =============================================================================
-- 7. PROPERTY VIEWINGS (TOUR TRACKER)
-- =============================================================================
CREATE TABLE IF NOT EXISTS property_viewings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_account_id INTEGER NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES users(agent_code),
    property_title TEXT NOT NULL,
    property_location TEXT NOT NULL,
    property_price REAL NOT NULL,
    property_image TEXT,
    agent_name TEXT NOT NULL,
    agent_phone TEXT NOT NULL,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Confirmed', -- 'Confirmed', 'Pending', 'Cancelled', 'Completed'
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 8. AI CONVERSATIONS & MULTI-SESSION STORAGE
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- User ID or Customer Account ID (NULL for guest sessions)
    mode TEXT NOT NULL DEFAULT 'agent', -- 'agent' or 'customer'
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' | 'assistant'
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 9. ANALYTICS: PIPELINE FUNNEL STAGES
-- =============================================================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT REFERENCES users(agent_code) ON DELETE CASCADE,
    name TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    conversion_rate REAL NOT NULL DEFAULT 0,
    period TEXT NOT NULL DEFAULT 'current',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 10. ANALYTICS: SALES TRENDS (MONTHLY REVENUE)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sales_trend (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT REFERENCES users(agent_code) ON DELETE CASCADE,
    month TEXT NOT NULL,
    value REAL NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 11. ANALYTICS: ENQUIRY ACQUISITION SOURCES
-- =============================================================================
CREATE TABLE IF NOT EXISTS enquiry_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT REFERENCES users(agent_code) ON DELETE CASCADE,
    source TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    percentage REAL NOT NULL DEFAULT 0,
    period TEXT NOT NULL DEFAULT 'current',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 12. ANALYTICS: FOLLOW-UP HEALTH & SLA PERFORMANCE
-- =============================================================================
CREATE TABLE IF NOT EXISTS follow_up_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT REFERENCES users(agent_code) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    value REAL NOT NULL DEFAULT 0,
    label TEXT NOT NULL,
    sub TEXT,
    period TEXT NOT NULL DEFAULT 'current',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```
