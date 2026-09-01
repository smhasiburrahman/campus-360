import os

entity_dir = '/Users/rotenz3nsdigit/Campus360/Backend/src/main/java/com/campus360/entity'
repo_dir = '/Users/rotenz3nsdigit/Campus360/Backend/src/main/java/com/campus360/repository'

os.makedirs(repo_dir, exist_ok=True)

entities = [f[:-5] for f in os.listdir(entity_dir) if f.endswith('.java')]

for entity in entities:
    # Some entities might have a Long id, some Integer id
    # I'll default to Long for all as most generated ones use Long
    java_code = f"package com.campus360.repository;\n\n"
    java_code += f"import com.campus360.entity.{entity};\n"
    java_code += f"import org.springframework.data.jpa.repository.JpaRepository;\n"
    java_code += f"import org.springframework.stereotype.Repository;\n\n"
    java_code += f"@Repository\n"
    java_code += f"public interface {entity}Repository extends JpaRepository<{entity}, Long> {{\n"
    java_code += f"}}\n"
    
    with open(os.path.join(repo_dir, f"{entity}Repository.java"), 'w') as out_f:
        out_f.write(java_code)

print(f"Generated {len(entities)} repositories.")
