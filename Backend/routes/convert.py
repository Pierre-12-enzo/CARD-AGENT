from playwright.sync_api import sync_playwright
import time
import os
import re

chapters = [
    ("01_DBMS_Overview", "DBMS Overview", "https://www.tutorialspoint.com/dbms/dbms_overview.htm"),
    ("02_DBMS_Architecture", "DBMS Architecture", "https://www.tutorialspoint.com/dbms/dbms_architecture.htm"),
    ("03_Data_Models", "Data Models", "https://www.tutorialspoint.com/dbms/dbms_data_models.htm"),
    ("04_Data_Schemas", "Data Schemas", "https://www.tutorialspoint.com/dbms/dbms_data_schemas.htm"),
    ("05_Data_Independence", "Data Independence", "https://www.tutorialspoint.com/dbms/dbms_data_independence.htm"),
    ("06_DBMS_System_Environment", "DBMS Environment Overview", "https://www.tutorialspoint.com/dbms/dbms_system_environment.htm"),
    ("07_Centralized_Client_Server_Architecture", "Centralized and Client Server Architecture", "https://www.tutorialspoint.com/dbms/dbms_centralized_and_client_server_architecture.htm"),
    ("08_Classification", "Classification", "https://www.tutorialspoint.com/dbms/dbms_classification.htm"),
    ("09_Codd's_12_Rules", "Codd's 12 Rules", "https://www.tutorialspoint.com/dbms/dbms_codds_rules.htm"),
    ("10_Relation_Data_Model", "Relation Data Model", "https://www.tutorialspoint.com/dbms/relational_data_model.htm"),
    ("11_Constraints", "Constraints", "https://www.tutorialspoint.com/dbms/dbms_relational_model_constraints.htm"),
    ("12_Schemas", "Schemas", "https://www.tutorialspoint.com/dbms/dbms_relational_database_schemas.htm"),
    ("13_Handling_Constraint_Violations", "Handling Constraint Violations", "https://www.tutorialspoint.com/dbms/dbms_handling_constraint_violations.htm"),
    ("14_ER_Model", "ER Model Basic Concepts", "https://www.tutorialspoint.com/dbms/er_model_basic_concepts.htm"),
    ("15_ER_Diagram", "ER Diagram Representation", "https://www.tutorialspoint.com/dbms/er_diagram_representation.htm"),
    ("16_Relationship_Types", "Relationship Types and Relationship Sets in DBMS", "https://www.tutorialspoint.com/dbms/relationship_types_and_relationship_sets_in_dbms.htm"),
    ("17_Weak_Entity_Types", "Weak Entity Types", "https://www.tutorialspoint.com/dbms/dbms_weak_entity_types.htm"),
    ("18_Generalization_Aggregation", "Generalization Aggregation", "https://www.tutorialspoint.com/dbms/dbms_generalization_aggregation.htm"),
    ("19_Draw_ER_Diagram", "Drawing an ER Diagram", "https://www.tutorialspoint.com/dbms/dbms_drawing_er_diagram.htm"),
    ("20_EER_Model", "Enhanced ER (EER) Model", "https://www.tutorialspoint.com/dbms/dbms_enhanced_er_model.htm"),
    ("21_Subclass_Superclass_Inheritance", "Subclass, Superclass and Inheritance in EER", "https://www.tutorialspoint.com/dbms/subclass_superclass_and_inheritance_in_eer.htm"),
    ("22_Extended_ER_Model", "Specialization and Generalization in Extended ER Model", "https://www.tutorialspoint.com/dbms/specialization_and_generalization_in_extended_er_model.htm"),
    ("23_Data_Abstraction", "Data Abstraction and Knowledge Representation", "https://www.tutorialspoint.com/dbms/data_abstraction_and_knowledge_representation.htm"),
    ("24_Functional_Dependency", "Functional Dependency", "https://www.tutorialspoint.com/dbms/dbms_functional_dependency.htm"),
    ("25_Inference_Rules", "Inference Rules in DBMS", "https://www.tutorialspoint.com/dbms/dbms_inference_rules.htm"),
    ("26_Minimal_Cover", "Minimal Cover", "https://www.tutorialspoint.com/dbms/dbms_minimal_cover.htm"),
    ("27_Equivalence_Functional_Dependencies", "Equivalence of Functional Dependencies", "https://www.tutorialspoint.com/dbms/equivalence_of_functional_dependency.htm"),
    ("28_Finding_Attribute_Closure", "Finding Attribute Closure and Candidate Keys", "https://www.tutorialspoint.com/dbms/finding_attribute_closure_and_candidate_keys_using_functional_dependency.htm"),
    ("29_DBMS_Keys", "Importance of Keys in DBMS", "https://www.tutorialspoint.com/dbms/keys_in_dbms.htm"),
    ("30_Super_Candidate_Keys", "Super Keys and Candidate Keys", "https://www.tutorialspoint.com/dbms/dbms_super_keys_and_candidate_keys.htm"),
    ("31_Foreign_Key", "Foreign Key", "https://www.tutorialspoint.com/dbms/dbms_foreign_key.htm"),
    ("32_Finding_Candidate_Keys", "Finding Candidate Keys using Functional Dependencies", "https://www.tutorialspoint.com/dbms/finding_candidate_keys_using_functional_dependencies.htm"),
    ("33_Normalization", "Normalization", "https://www.tutorialspoint.com/dbms/database_normalization.htm"),
    ("34_First_Normal_Form", "First Normal Form (1NF) in DBMS", "https://www.tutorialspoint.com/dbms/dbms_first_normal_form.htm"),
    ("35_Second_Normal_Form", "Second Normal Form (2NF) in DBMS", "https://www.tutorialspoint.com/dbms/dbms_second_normal_form.htm"),
    ("36_Third_Normal_Form", "Third Normal Form (3NF) in DBMS", "https://www.tutorialspoint.com/dbms/dbms_third_normal_form.htm"),
    ("37_Boyce_Codd_Normal_Form", "Boyce-Codd Normal Form (BCNF) in DBMS", "https://www.tutorialspoint.com/dbms/dbms_boyce_codd_normal_form.htm"),
    ("38_4NF_5NF", "Difference Between 4NF and 5NF", "https://www.tutorialspoint.com/dbms/difference_between_4nf_and_5nf.htm"),
]

print("=" * 60)
print("Creating DBMS Notes with Clean Content (No Sidebar) and Working TOC")
print("=" * 60)

print("\n📄 Step 1: Creating individual chapter PDFs...")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    for filename, title, url in chapters:
        print(f"    Processing: {title[:50]}...")
        try:
            page = browser.new_page()
            page.goto(url, timeout=60000)
            time.sleep(2)
            page.pdf(path=f"{filename}.pdf", format="A4", print_background=True)
            page.close()
            print(f"      ✓ Saved: {filename}.pdf")
        except Exception as e:
            print(f"      ✗ Error: {e}")
    
    browser.close()

print("\n📝 Step 2: Creating clean HTML with only main content...")

html_content = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DBMS Complete Notes</title>
    <style>
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0 auto; 
            padding: 40px; 
            line-height: 1.6; 
            max-width: 1000px; 
        }
        h1 { 
            color: #2c3e50; 
            border-bottom: 3px solid #2c3e50; 
            padding-bottom: 10px; 
            margin-top: 30px;
        }
        h2 { 
            color: #34495e; 
            margin-top: 25px; 
            background: #ecf0f1; 
            padding: 8px 12px; 
        }
        h3 { 
            color: #555; 
            margin-top: 20px; 
        }
        pre { 
            background: #f4f4f4; 
            padding: 12px; 
            border-left: 4px solid #2c3e50; 
            overflow-x: auto; 
            font-family: 'Courier New', monospace;
        }
        code { 
            background: #f4f4f4; 
            padding: 2px 6px; 
            font-family: 'Courier New', monospace;
        }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 15px 0; 
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
        }
        th { 
            background: #2c3e50; 
            color: white; 
        }
        img { 
            max-width: 100%; 
            height: auto; 
        }
        ul, ol { 
            margin: 10px 0; 
            padding-left: 30px; 
        }
        .toc { 
            margin: 30px 0; 
            background: #f8f9fa; 
            padding: 20px 30px; 
            border-radius: 8px; 
            border: 1px solid #ddd;
        }
        .toc h2 {
            background: none;
            padding: 0;
            margin-top: 0;
        }
        .toc-item { 
            margin: 10px 0; 
        }
        .toc-item a { 
            text-decoration: none; 
            color: #2980b9; 
            font-size: 14px;
        }
        .toc-item a:hover { 
            text-decoration: underline; 
        }
        .page-break { 
            page-break-before: always; 
        }
        .chapter-title {
            color: #2c3e50;
            margin-top: 0;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <h1>Database Management Systems</h1>
    <p style="color: #7f8c8d; margin-bottom: 30px;">Complete Tutorial Notes from TutorialsPoint</p>
    
    <div class="toc">
        <h2>📑 Table of Contents</h2>
'''

# Add TOC entries
for i, (filename, title, url) in enumerate(chapters, 1):
    html_content += f'        <div class="toc-item"><a href="#ch{i}">Chapter {i}: {title}</a></div>\n'

html_content += '    </div>\n'

print("\n🌐 Step 3: Extracting clean content from each chapter...")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    for i, (filename, title, url) in enumerate(chapters, 1):
        print(f"    Extracting: Chapter {i} - {title[:40]}...")
        try:
            page.goto(url, timeout=60000)
            time.sleep(2)
            
            # Get ONLY the main content area
            main_content = page.query_selector('div.content')
            
            if main_content:
                chapter_html = main_content.inner_html()
            else:
                # Fallback: get body and try to filter
                body = page.query_selector('body')
                if body:
                    chapter_html = body.inner_html()
                else:
                    chapter_html = "<p>Content could not be extracted</p>"
            
            # Remove any remaining ads and sidebars
            chapter_html = re.sub(r'<div[^>]*class="[^"]*advertisement[^"]*"[^>]*>.*?</div>', '', chapter_html, flags=re.DOTALL | re.IGNORECASE)
            chapter_html = re.sub(r'<div[^>]*class="[^"]*ads[^"]*"[^>]*>.*?</div>', '', chapter_html, flags=re.DOTALL | re.IGNORECASE)
            chapter_html = re.sub(r'<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>.*?</div>', '', chapter_html, flags=re.DOTALL | re.IGNORECASE)
            chapter_html = re.sub(r'<div[^>]*class="[^"]*nav[^"]*"[^>]*>.*?</div>', '', chapter_html, flags=re.DOTALL | re.IGNORECASE)
            
            # Add to master HTML
            html_content += f'\n<div id="ch{i}" class="page-break">\n'
            html_content += f'<h1 class="chapter-title">Chapter {i}: {title}</h1>\n'
            html_content += chapter_html
            html_content += '\n</div>\n'
            
        except Exception as e:
            print(f"      ✗ Error: {e}")
            html_content += f'\n<div id="ch{i}" class="page-break">\n'
            html_content += f'<h1>Chapter {i}: {title}</h1>\n'
            html_content += f'<p style="color: red;">Error loading content: {e}</p>\n'
            html_content += '</div>\n'
    
    browser.close()

html_content += '\n</body>\n</html>'

# Save the HTML file
with open("DBMS_Complete_Notes.html", "w", encoding="utf-8") as f:
    f.write(html_content)

print("\n" + "=" * 60)
print("✅ SUCCESS!")
print("=" * 60)
print("\n📁 Files created:")
print("   - 38 individual chapter PDFs (01_*.pdf to 38_*.pdf)")
print("   - DBMS_Complete_Notes.html (clean content, no sidebar)")
print("\n" + "=" * 60)
print("📖 NEXT STEPS:")
print("=" * 60)
print("")
print("1. Open the HTML in LibreOffice:")
print("   libreoffice DBMS_Complete_Notes.html")
print("")
print("2. When LibreOffice opens, select:")
print("   ✅ 'Keep original formatting'")
print("")
print("3. Update the Table of Contents:")
print("   Right-click on TOC → 'Update Index/Table'")
print("")
print("4. Export as PDF with bookmarks:")
print("   File → Export As → Export as PDF")
print("   ✅ Check 'Create bookmarks'")
print("   ✅ Check 'Export bookmarks'")
print("")
print("5. Save as: DBMS_FINAL.pdf")
print("")
print("=" * 60)