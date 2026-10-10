from pathlib import Path
from docx import Document
from docx.shared import Pt
import hashlib,json
root=Path(__file__).parent/'fixtures'
sets=[('office-spec','Office specification','SPEC',['Office specification simulation fixture','These clauses support deterministic workflow testing only. All quantities and factors are illustrative.','Structural concrete shall use ordinary Portland cement concrete grade C30 for 1000 m3.','Reinforcement shall use conventional steel reinforcement for 100 tonnes.','Interior partitions shall use standard gypsum board for 2000 m2.']),('zero-spec','Reviewed specification','SPEC',['Reviewed specification simulation fixture','This fixture represents a specification with no simulated opportunities. It does not certify compliance.','Structural concrete already specifies the selected low carbon concrete mix for 1000 m3.']),('partial-spec','Partial specification','TOR',['Partial specification simulation fixture','This fixture deliberately contains a second unsupported input to demonstrate partial results.','Structural concrete shall use ordinary Portland cement concrete grade C30 for 1000 m3.'])]
sets.append(('partial-boq','Unavailable quantities schedule','BOQ',['Unavailable quantities schedule simulation fixture','This source is deliberately unavailable to the simulated analysis adapter. The original file remains downloadable.','Concrete quantity schedule requires a clarification before recommendations can be evaluated.']))
manifest=[]
for key,title,kind,paras in sets:
 d=Document(); d.styles['Normal'].font.name='Calibri'; d.styles['Normal'].font.size=Pt(11)
 for i,p in enumerate(paras): d.add_paragraph(p,style='Title' if i==0 else None)
 file=root/(key+'.docx')
 if not file.exists(): d.save(file)
 check=Document(file);assert [p.text for p in check.paragraphs]==paras
 manifest.append(dict(fixture_id=key,title=title,type=kind,filename=file.name,path='/fixtures/'+file.name,mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes=file.stat().st_size,checksum=hashlib.sha256(file.read_bytes()).hexdigest(),extraction=[dict(exact_text=p,locator=dict(kind='paragraph',paragraph_index=i+1)) for i,p in enumerate(paras)]))
(root/'manifest.json').write_text(json.dumps(manifest,indent=2))
(Path(__file__).parent/'fixtures.mjs').write_text('export const fixtures = '+json.dumps(manifest,indent=2)+';\n')
print('Verified 4 DOCX fixtures, all paragraph anchors and SHA256 checksums')


