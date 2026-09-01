import re
import os

schema_path = '/Users/rotenz3nsdigit/Campus360/campus360_schema.sql'
out_dir = '/Users/rotenz3nsdigit/Campus360/Backend/src/main/java/com/campus360/entity'

with open(schema_path, 'r') as f:
    content = f.read()

# basic type mapping
type_map = {
    'INT': 'Integer',
    'BIGINT': 'Long',
    'SMALLINT': 'Integer',
    'TINYINT': 'Integer',
    'VARCHAR': 'String',
    'TEXT': 'String',
    'DECIMAL': 'java.math.BigDecimal',
    'DATETIME': 'java.time.LocalDateTime',
    'TIMESTAMP': 'java.time.LocalDateTime',
    'DATE': 'java.time.LocalDate',
    'BOOLEAN': 'Boolean',
    'ENUM': 'String'
}

def to_camel_case(snake_str):
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def to_pascal_case(snake_str):
    components = snake_str.split('_')
    return ''.join(x.title() for x in components)

table_matches = re.finditer(r'CREATE TABLE\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*ENGINE', content, re.DOTALL)

for match in table_matches:
    table_name = match.group(1)
    columns_str = match.group(2)
    
    if table_name in ['students', 'university_authority', 'app_settings']: 
        continue # Already created or not needed as entity
        
    class_name = to_pascal_case(table_name)
    if class_name.endswith('s') and class_name != 'Campus360':
        class_name = class_name[:-1] # rudimentary singularization
        if class_name.endswith('Ie'):
            class_name = class_name[:-2] + 'y'
        if class_name == 'MaterialShare':
            pass
        if table_name == 'shuttles': class_name = 'Shuttle'
        if table_name == 'courses': class_name = 'Course'
        if table_name == 'trimesters': class_name = 'Trimester'
        if table_name == 'complaints': class_name = 'Complaint'
        if table_name == 'announcements': class_name = 'Announcement'
        if table_name == 'events': class_name = 'Event'
        if table_name == 'vendor_profiles': class_name = 'VendorProfile'
        if table_name == 'marketplace_listings': class_name = 'MarketplaceListing'
        if table_name == 'vendor_reviews': class_name = 'VendorReview'
        if table_name == 'study_sessions': class_name = 'StudySession'
        if table_name == 'study_session_participants': class_name = 'StudySessionParticipant'
        if table_name == 'material_shares': class_name = 'MaterialShare'
        if table_name == 'material_files': class_name = 'MaterialFile'
        if table_name == 'post_images': class_name = 'PostImage'
        if table_name == 'post_likes': class_name = 'PostLike'
        if table_name == 'post_comments': class_name = 'PostComment'
        if table_name == 'post_bookmarks': class_name = 'PostBookmark'
        if table_name == 'post_reports': class_name = 'PostReport'
        if table_name == 'shuttle_routes': class_name = 'ShuttleRoute'
        if table_name == 'route_stops': class_name = 'RouteStop'
        if table_name == 'shuttle_trips': class_name = 'ShuttleTrip'
        if table_name == 'shuttle_locations': class_name = 'ShuttleLocation'
    
    # parse lines
    lines = columns_str.split('\n')
    fields = []
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('--') or line.startswith('PRIMARY KEY') or line.startswith('CONSTRAINT') or line.startswith('UNIQUE') or line.startswith('INDEX'):
            continue
            
        parts = re.split(r'\s+', line)
        if len(parts) >= 2:
            col_name = parts[0].strip('`')
            col_type_raw = parts[1].upper()
            
            # extract base type
            base_type_match = re.match(r'([A-Z]+)', col_type_raw)
            if not base_type_match:
                continue
            base_type = base_type_match.group(1)
            
            java_type = type_map.get(base_type, 'String')
            
            field_name = to_camel_case(col_name)
            
            # annotations
            annotations = []
            if col_name == 'id':
                annotations.append('@Id')
                annotations.append('@GeneratedValue(strategy = GenerationType.IDENTITY)')
            
            if 'NOT NULL' in line:
                annotations.append('@Column(name = "' + col_name + '", nullable = false)')
            else:
                annotations.append('@Column(name = "' + col_name + '")')
                
            if col_name == 'created_at':
                annotations.append('@CreationTimestamp')
            if col_name == 'updated_at':
                annotations.append('@UpdateTimestamp')
                
            fields.append({
                'name': field_name,
                'type': java_type,
                'annotations': annotations
            })
            
    # Write java file
    java_code = f"package com.campus360.entity;\n\n"
    java_code += f"import jakarta.persistence.*;\n"
    java_code += f"import lombok.Getter;\n"
    java_code += f"import lombok.Setter;\n"
    java_code += f"import org.hibernate.annotations.CreationTimestamp;\n"
    java_code += f"import org.hibernate.annotations.UpdateTimestamp;\n"
    java_code += f"import java.time.LocalDateTime;\n"
    java_code += f"import java.time.LocalDate;\n\n"
    
    java_code += f"@Getter\n@Setter\n@Entity\n@Table(name = \"{table_name}\")\n"
    java_code += f"public class {class_name} {{\n"
    
    for f_desc in fields:
        for ann in f_desc['annotations']:
            # replace multiple columns with one if necessary, or just rely on the latest
            if ann.startswith('@Column'):
                if '@CreationTimestamp' in f_desc['annotations']:
                    ann = ann.replace('nullable = false', 'nullable = false, updatable = false')
            java_code += f"    {ann}\n"
        java_code += f"    private {f_desc['type']} {f_desc['name']};\n\n"
        
    java_code += f"}}\n"
    
    with open(os.path.join(out_dir, f"{class_name}.java"), 'w') as out_f:
        out_f.write(java_code)

print("Entities generated successfully.")
