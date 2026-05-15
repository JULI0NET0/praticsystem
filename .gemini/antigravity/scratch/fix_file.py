import sys

file_path = "/Users/julioneto/PRATIC SYSTEM/src/app/admin/clients/[id]/page.tsx"

with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    # Detect the messed up area
    if 'label style={{ fontSize: \'0.875rem\', color: \'var(--text-secondary)\' }}>Serviço de Interesse</label>' in line:
        new_lines.append(line)
        new_lines.append('                      <select\n')
        new_lines.append('                        className="input-dark"\n')
        new_lines.append('                        value={editFormData.servico_interesse || \'\'}\n')
        new_lines.append('                        onChange={(e) => setEditFormData({ ...editFormData, servico_interesse: e.target.value })}\n')
        new_lines.append('                      >\n')
        new_lines.append('                        <option value="">Selecione um serviço</option>\n')
        new_lines.append('                        {availableServices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}\n')
        new_lines.append('                      </select>\n')
        new_lines.append('                    </div>\n')
        new_lines.append('                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>\n')
        new_lines.append('                      <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Data de Onboarding</label>\n')
        new_lines.append('                      <input type="date" className="input-dark" value={editFormData.onboarding_date || ""} onChange={(e) => setEditFormData({ ...editFormData, onboarding_date: e.target.value })} />\n')
        new_lines.append('                    </div>\n')
        new_lines.append('                  </div>\n')
        new_lines.append('                </section>\n')
        skip = True
        continue
    
    if skip:
        if '{/* Contato e Financeiro */}' in line or 'Contato e Financeiro' in line:
            skip = False
            # Check if we should append this line or if it's already handled
            if 'section' in line and 'display: \'flex\'' in line:
                 new_lines.append(line)
            else:
                 # Search for the start of the next section
                 pass
        continue
    
    if not skip:
        new_lines.append(line)

# This script is a bit risky if it doesn't find the exact next section.
# Let's try a simpler approach: replace the block between "Serviço de Interesse" and "Contato e Financeiro"

content = "".join(lines)
import re

pattern = re.compile(r'(<label style=\{\{ fontSize: \'0\.875rem\', color: \'var\(--text-secondary\)\' \}\}>Serviço de Interesse</label>).*?(\{/\* Contato e Financeiro \*/\}|Contato e Financeiro)', re.DOTALL)

replacement = r'''\1
                      <select
                        className="input-dark"
                        value={editFormData.servico_interesse || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, servico_interesse: e.target.value })}
                      >
                        <option value="">Selecione um serviço</option>
                        {availableServices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Data de Onboarding</label>
                      <input type="date" className="input-dark" value={editFormData.onboarding_date || ""} onChange={(e) => setEditFormData({ ...editFormData, onboarding_date: e.target.value })} />
                    </div>
                  </div>
                </section>

                \2'''

new_content = pattern.sub(replacement, content)

with open(file_path, 'w') as f:
    f.write(new_content)
