import os
import glob
from import_contract import parse_contract_text, import_contract_to_supabase

def main():
    root_dir = os.path.dirname(os.path.dirname(__file__))
    
    # Padrão de busca para pegar arquivos .txt que sejam contratos
    # Vamos buscar no diretório raiz
    txt_files = glob.glob(os.path.join(root_dir, "*.txt"))
    
    contratos_a_importar = []
    for filepath in txt_files:
        filename = os.path.basename(filepath)
        # Ignora arquivos de modelo, requirements e o antigo na pasta components se houver
        if "MODELO" in filename or "requirements" in filename:
            continue
        # Verifica se o nome tem relação com contrato
        if "Contrato" in filename:
            contratos_a_importar.append(filepath)

    print(f"Encontrados {len(contratos_a_importar)} contratos para processar:")
    for c in contratos_a_importar:
        print(f"  - {os.path.basename(c)}")
    print("-" * 50)

    for path in contratos_a_importar:
        filename = os.path.basename(path)
        print(f"\n>>> PROCESSANDO: {filename} <<<")
        try:
            extracted_data = parse_contract_text(path)
            
            # Validação rápida de dados essenciais extraídos
            if not extracted_data.get("name") or not extracted_data.get("email"):
                print(f"AVISO: Não foi possível extrair nome ou e-mail de {filename}. Ignorando...")
                continue
                
            print(f"Cliente: {extracted_data['name']}")
            print(f"E-mail: {extracted_data['email']}")
            print(f"Valor: R$ {extracted_data['value']:.2f}")
            print(f"Data início: {extracted_data['start_date']}")
            
            import_contract_to_supabase(extracted_data)
            print(f"Sucesso ao importar {filename}!")
        except Exception as e:
            print(f"ERRO ao processar {filename}: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()
