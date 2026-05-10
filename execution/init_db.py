import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Carregar variáveis de ambiente
load_dotenv()

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("ERRO: Credenciais do Supabase não encontradas no arquivo .env")
    exit(1)

supabase: Client = create_client(url, key)

# SQL para criação das tabelas
sql_script = """
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabelas de Usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabelas de Clientes
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Redes Sociais
CREATE TABLE IF NOT EXISTS client_social_media_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    username TEXT,
    password TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Notas do Cliente
CREATE TABLE IF NOT EXISTS client_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Arquivos do Cliente
CREATE TABLE IF NOT EXISTS client_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Serviços
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    contract_term_months INTEGER,
    is_recurring BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Contratos
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id),
    start_date DATE,
    end_date DATE,
    is_auto_renew BOOLEAN DEFAULT FALSE,
    contract_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Faturas
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    issue_date DATE,
    due_date DATE,
    amount DECIMAL(10,2),
    status TEXT DEFAULT 'pending', -- pending, paid, overdue, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Portfólio
CREATE TABLE IF NOT EXISTS portfolio_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    main_image_url TEXT,
    results TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Agenda
CREATE TABLE IF NOT EXISTS agency_agenda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    type TEXT, -- captação, reunião, pagamento, contato, demanda
    responsible_user_id UUID REFERENCES users(id),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""

def init_database():
    print("Iniciando a criação das tabelas no Supabase...")
    try:
        # Nota: O cliente da biblioteca python 'supabase' não tem um método direto para rodar SQL raw arbitrário
        # que contenha múltiplos comandos de criação de tabela da mesma forma que a interface web.
        # Geralmente usamos a API RPC ou executamos via migrations.
        # Para este script, usaremos o supabase.rpc se houver uma função 'exec_sql' definida,
        # ou instruiremos o usuário a colar no SQL Editor caso o acesso direto via service role não suporte DDL massivo.
        
        # Como alternativa segura e determinística seguindo a arquitetura:
        # Vamos usar o mcp_supabase-mcp-server se disponível, ou sugerir o SQL Editor.
        
        print("Esquema SQL gerado com sucesso.")
        print("DICA: Recomenda-se aplicar este SQL via Migrations ou SQL Editor do Supabase.")
        
        # Para fins de automação, se o projeto for novo, podemos tentar executar via rpc ou ferramenta MCP
        return sql_script
    except Exception as e:
        print(f"Erro ao inicializar banco: {e}")
        return None

if __name__ == "__main__":
    sql = init_database()
    if sql:
        with open("init_db.sql", "w") as f:
            f.write(sql)
        print("Arquivo init_db.sql geratedo.")
