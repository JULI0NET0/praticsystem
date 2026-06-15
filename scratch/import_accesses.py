import zipfile
import urllib.request
import json
import ssl
import os

# Desabilita verificação SSL para evitar o erro do macOS
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

SUPABASE_URL = "https://uemmewnqgxwodifuslgy.supabase.co"
# Usamos a service role key para ter privilégios totais de escrita/bypass RLS
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlbW1ld25xZ3h3b2RpZnVzbGd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQxNTIyOSwiZXhwIjoyMDkzOTkxMjI5fQ.B-OsXpab8iQB-h3TH3HXEz6vIcn02KmPik5mm0o5FkY"
DOCX_PATH = "/Users/julioneto/PRATIC SYSTEM/Acessos Clientes .docx"

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}"
}

# 1. Mapeamento de Clientes (com base nos IDs reais consultados)
# RECLOSET BAZAR: 378cb824-01e7-4459-a404-9d73bb754ff8 -> image1.jpg
# Dra. Letícia: b33675c8-707c-4a07-8903-ea7410132b84 -> image2.jpg
# BALLOARTS: 51c4871c-b8aa-4a95-8643-9315c35a141d -> image3.jpg
# LOOOM ILUMINAÇÃO: 196d6f2f-f087-47e7-b8ed-57f9535db5b2 -> image4.jpg
# CAVEZZO MOVEIS: 028fb1ed-18cb-4ddf-bd83-9b6013294de0 -> sem imagem
# Kallas Design -> cadastrar primeiro, sem imagem

client_mappings = {
    "RECLOSET BAZAR": {
        "id": "378cb824-01e7-4459-a404-9d73bb754ff8",
        "image": "word/media/image1.jpg",
        "instagram": "recloset.bazar",
        "senha": "C@miT@ti1412"
    },
    "Dra. Letícia": {
        "id": "b33675c8-707c-4a07-8903-ea7410132b84",
        "image": "word/media/image2.jpg",
        "instagram": "dra.leticiaaguiar",
        "senha": "galerini95"
    },
    "BALLOARTS": {
        "id": "51c4871c-b8aa-4a95-8643-9315c35a141d",
        "image": "word/media/image3.jpg",
        "instagram": "balloarts",
        "senha": "balloartskidslondrina"
    },
    "LOOOM ILUMINAÇÃO": {
        "id": "196d6f2f-f087-47e7-b8ed-57f9535db5b2",
        "image": "word/media/image4.jpg",
        "instagram": "looomiluminacao",
        "senha": "looomiluminacao2017"
    },
    "CAVEZZO MOVEIS": {
        "id": "028fb1ed-18cb-4ddf-bd83-9b6013294de0",
        "image": None,
        "instagram": "cavezzomoveis",
        "senha": "Ml#00193728"
    },
    "Kallas Design": {
        "id": None, # cadastrar
        "image": None,
        "instagram": "kallas.design",
        "senha": "Luzearte.2026"
    }
}

# 2. Cadastrar Kallas Design se necessário
kallas_name = "Kallas Design"
# Verificar se já existe no banco
check_url = f"{SUPABASE_URL}/rest/v1/clients?name=eq.Kallas%20Design"
req = urllib.request.Request(check_url, headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx) as res:
        existing = json.loads(res.read().decode('utf-8'))
        if existing:
            client_mappings["Kallas Design"]["id"] = existing[0]["id"]
            print(f"Kallas Design já existe com ID: {existing[0]['id']}")
        else:
            # Cadastrar
            print("Cadastrando Kallas Design...")
            create_url = f"{SUPABASE_URL}/rest/v1/clients"
            kallas_data = {
                "name": "Kallas Design",
                "nome_fantasia": "Kallas Design",
                "cnpj": "00.000.000/0000-00",
                "tipo_pessoa": "PJ",
                "contact_name": "Kallas Design",
                "email": "contato@kallasdesign.com",
                "phone": "(00) 00000-0000",
                "status": "active"
            }
            req_post = urllib.request.Request(
                create_url,
                data=json.dumps(kallas_data).encode('utf-8'),
                headers={**headers, "Content-Type": "application/json", "Prefer": "return=representation"}
            )
            with urllib.request.urlopen(req_post, context=ctx) as res_post:
                created = json.loads(res_post.read().decode('utf-8'))
                client_mappings["Kallas Design"]["id"] = created[0]["id"]
                print(f"Kallas Design cadastrado com ID: {created[0]['id']}")
except Exception as e:
    print("Erro ao verificar/cadastrar Kallas Design:", e)

# 3. Processar cada cliente
for client_name, info in client_mappings.items():
    client_id = info["id"]
    if not client_id:
        print(f"Pulando {client_name} devido a ID ausente.")
        continue

    print(f"\nProcessando {client_name} (ID: {client_id})...")

    public_image_url = None

    # Se tiver imagem, extrair do docx e fazer upload
    if info["image"]:
        try:
            with zipfile.ZipFile(DOCX_PATH) as docx:
                image_bytes = docx.read(info["image"])
                
                # Fazer upload para o Storage
                # Determinando o tipo de imagem
                ext = info["image"].split('.')[-1]
                content_type = f"image/{ext}"
                filename = f"reserva_codigo.{ext}"
                storage_path = f"{client_id}/{filename}"
                
                # URL de upload no Supabase Storage
                upload_url = f"{SUPABASE_URL}/storage/v1/object/client-documents/{storage_path}"
                
                # Tentar fazer upload (PUT)
                req_upload = urllib.request.Request(
                    upload_url,
                    data=image_bytes,
                    headers={**headers, "Content-Type": content_type},
                    method="POST" # Tenta POST primeiro, se falhar ou já existir, podemos usar PUT
                )
                
                # Como pode já existir, vamos tratar o erro para tentar sobrescrever (PUT)
                try:
                    with urllib.request.urlopen(req_upload, context=ctx) as res_up:
                        print(f"Imagem enviada com sucesso para {storage_path}")
                except Exception as up_err:
                    # Tentar PUT para sobrescrever
                    req_overwrite = urllib.request.Request(
                        upload_url,
                        data=image_bytes,
                        headers={**headers, "Content-Type": content_type},
                        method="PUT"
                    )
                    with urllib.request.urlopen(req_overwrite, context=ctx) as res_up:
                        print(f"Imagem sobrescrita com sucesso para {storage_path}")
                
                # Obter a URL pública
                public_image_url = f"{SUPABASE_URL}/storage/v1/object/public/client-documents/{storage_path}"
                print(f"URL pública da imagem: {public_image_url}")
        except Exception as e:
            print(f"Erro ao extrair/enviar imagem de {client_name}: {e}")

    # Atualizar social_access no Supabase
    try:
        # Primeiro, buscar social_access atual
        get_url = f"{SUPABASE_URL}/rest/v1/clients?id=eq.{client_id}&select=social_access"
        req_get = urllib.request.Request(get_url, headers=headers)
        current_social = {}
        with urllib.request.urlopen(req_get, context=ctx) as res_get:
            res_data = json.loads(res_get.read().decode('utf-8'))
            if res_data and res_data[0].get("social_access"):
                current_social = res_data[0]["social_access"]
                if not isinstance(current_social, dict):
                    current_social = {}
        
        # Atualizar a parte do Instagram
        instagram_data = current_social.get("instagram", {})
        if not isinstance(instagram_data, dict):
            instagram_data = {}
            
        instagram_data["usuario"] = info["instagram"]
        instagram_data["senha"] = info["senha"]
        instagram_data["ativo"] = True
        
        if public_image_url:
            instagram_data["reserva_image_url"] = public_image_url
            
        current_social["instagram"] = instagram_data
        
        # Fazer patch do cliente no banco
        patch_url = f"{SUPABASE_URL}/rest/v1/clients?id=eq.{client_id}"
        patch_data = {"social_access": current_social}
        req_patch = urllib.request.Request(
            patch_url,
            data=json.dumps(patch_data).encode('utf-8'),
            headers={**headers, "Content-Type": "application/json"},
            method="PATCH"
        )
        with urllib.request.urlopen(req_patch, context=ctx) as res_patch:
            print(f"Acessos sociais de {client_name} atualizados com sucesso!")
            
    except Exception as e:
        print(f"Erro ao atualizar social_access de {client_name}: {e}")
