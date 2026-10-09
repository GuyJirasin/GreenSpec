from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from greenspec_core.catalog import get_catalog

@dataclass
class GraphNode:
    id: str
    label: str
    node_type: str                     # element, standard, constraint, material, product
    properties: Dict[str, Any] = field(default_factory=dict)

@dataclass
class GraphEdge:
    source: str
    target: str
    relation: str                      # GOVERNED_BY, MANDATES, ALLOWS_SCM, RESTRICTS, RECOMMENDS_PRODUCT, SUPPLIED_BY, CERTIFIED_BY
    properties: Dict[str, Any] = field(default_factory=dict)

class CivilKnowledgeGraph:
    """Deterministic Civil Engineering & Materials Knowledge Graph (GraphRAG)."""

    def __init__(self):
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: List[GraphEdge] = []
        self._build_default_graph()

    def add_node(self, node_id: str, label: str, node_type: str, **properties):
        self.nodes[node_id] = GraphNode(id=node_id, label=label, node_type=node_type, properties=properties)

    def add_edge(self, source: str, target: str, relation: str, **properties):
        self.edges.append(GraphEdge(source=source, target=target, relation=relation, properties=properties))

    def _build_default_graph(self):
        # 1. Structural Element Nodes
        self.add_node("elem_mat_foundation", "ฐานรากแผ่หนา / Mat Foundation", "element", thickness_m=">= 1.0", behavior="mass_concrete")
        self.add_node("elem_pt_slab", "แผ่นพื้นคอนกรีตอัดแรง / Post-Tensioned Slab", "element", behavior="early_stressing")
        self.add_node("elem_column", "เสาและผนังรับแรงเฉือน / Columns & Shear Walls", "element", behavior="high_axial_load")
        self.add_node("elem_beam_slab", "คานและพื้นหล่อในที่ทั่วไป / Beams & Slabs", "element", behavior="flexural")

        # 2. Engineering Standards Nodes
        self.add_node("std_tis_2135", "มอก. 2135-2545 (เถ้าลอยถ่านหิน)", "standard", scope="Fly Ash Class F / C SCM")
        self.add_node("std_tis_2594", "มอก. 2594-2556 (ปูนซีเมนต์ไฮดรอลิก)", "standard", scope="Hydraulic Cement Low Clinker")
        self.add_node("std_tis_2601", "มอก. 2601-2556 (เถ้าก้นเตามวลรวมคอนกรีต)", "standard", scope="Bottom Ash Aggregate")
        self.add_node("std_eit_1014", "มาตรฐาน วสท. 1014 / มยผ. 1101-1106", "standard", scope="Structural Concrete Building Code")
        self.add_node("std_aci_207", "ACI 207 (Mass Concrete Thermal Control)", "standard", scope="Heat of Hydration & Thermal Cracking")
        self.add_node("std_aci_318", "ACI 318-19 (Building Code Requirements)", "standard", scope="Durability & Structural Quality")
        self.add_node("std_astm_c618", "ASTM C618 (Coal Fly Ash Specification)", "standard", scope="Class F / C Pozzolan Specification")
        self.add_node("std_astm_c494", "ASTM C494 / มอก. 739 (Chemical Admixtures)", "standard", scope="PCE Superplasticizer HRWR Type F/G")
        self.add_node("std_doh_special", "ข้อกำหนดพิเศษกรมทางหลวง (DOH Highway Concrete)", "standard", scope="Bridge & Pavement Concrete")
        self.add_node("std_trees_leed", "เกณฑ์อาคารเขียว TREES v1.1 & LEED v4.1", "standard", scope="Low Embodied Carbon MR Credits & EPD")

        # 3. Engineering Constraints Nodes
        self.add_node("cst_thermal_limit", "ควบคุมอุณหภูมิความร้อนไฮเดรชัน (Delta T <= 20 deg C, Core < 70 deg C)", "constraint")
        self.add_node("cst_early_strength", "ต้องการกำลังอัดต้น (f'c >= 18-24 MPa ที่ 3-7 วันก่อนดึงลวด)", "constraint")
        self.add_node("cst_pt_scm_cap", "จำกัดสัดส่วนเถ้าลอยไม่เกิน 20% เพื่อไม่ให้กำลังต้นขึ้นช้า", "constraint")
        self.add_node("cst_mass_test_age", "อนุญาตให้ใช้เกณฑ์กำลังอัดที่อายุ 56 วัน (f'c,56) เป็นเกณฑ์ตรวจรับ", "constraint")
        self.add_node("cst_column_wb", "ควบคุมอัตราส่วน W/B <= 0.38 และใช้สารลดน้ำยิ่งยวด", "constraint")
        self.add_node("cst_moist_curing_7d", "บ่มชื้นต่อเนื่องไม่น้อยกว่า 7 วัน (14 วันสำหรับสูตร SCM สูง)", "constraint")

        # 4. Material Nodes
        self.add_node("mat_fly_ash_f", "เถ้าลอย มอก. 2135 ชั้น F (Mae Moh Fly Ash)", "material", carbon_kg_ton=18.0)
        self.add_node("mat_hydraulic_cement", "ปูนซีเมนต์ไฮดรอลิก มอก. 2594", "material", carbon_kg_ton=690.0)
        self.add_node("mat_bottom_ash", "เถ้าหนัก มอก. 2601 (Bottom Ash)", "material", carbon_kg_ton=12.0)
        self.add_node("mat_slag_ggbs", "ตะกรันเตาถลุงบดละเอียด (Slag ASTM C989)", "material", carbon_kg_ton=85.0)
        self.add_node("mat_pce_admixture", "สารลดน้ำยิ่งยวดโพลีคาร์บอกซิเลต (PCE Type F/G)", "material", carbon_kg_ton=150.0)

        # 5. Edges: Connect Mat Foundation
        self.add_edge("elem_mat_foundation", "std_aci_207", "GOVERNED_BY")
        self.add_edge("elem_mat_foundation", "std_eit_1014", "GOVERNED_BY")
        self.add_edge("elem_mat_foundation", "std_trees_leed", "GOVERNED_BY")
        self.add_edge("elem_mat_foundation", "cst_thermal_limit", "MANDATES")
        self.add_edge("elem_mat_foundation", "cst_mass_test_age", "MANDATES")
        self.add_edge("elem_mat_foundation", "mat_fly_ash_f", "ALLOWS_SCM", max_pct=40.0)
        self.add_edge("elem_mat_foundation", "mat_hydraulic_cement", "ALLOWS_SCM")
        self.add_edge("elem_mat_foundation", "mat_slag_ggbs", "ALLOWS_SCM", max_pct=45.0)
        self.add_edge("elem_mat_foundation", "mat_pce_admixture", "ALLOWS_SCM")

        # Edges: Connect PT Slab
        self.add_edge("elem_pt_slab", "std_aci_318", "GOVERNED_BY")
        self.add_edge("elem_pt_slab", "std_trees_leed", "GOVERNED_BY")
        self.add_edge("elem_pt_slab", "cst_early_strength", "MANDATES")
        self.add_edge("elem_pt_slab", "cst_pt_scm_cap", "MANDATES")
        self.add_edge("elem_pt_slab", "mat_hydraulic_cement", "ALLOWS_SCM")
        self.add_edge("elem_pt_slab", "mat_fly_ash_f", "RESTRICTS", max_pct=20.0)
        self.add_edge("elem_pt_slab", "mat_pce_admixture", "ALLOWS_SCM")

        # Edges: Connect Column
        self.add_edge("elem_column", "std_aci_318", "GOVERNED_BY")
        self.add_edge("elem_column", "std_astm_c494", "GOVERNED_BY")
        self.add_edge("elem_column", "cst_column_wb", "MANDATES")
        self.add_edge("elem_column", "mat_hydraulic_cement", "ALLOWS_SCM")
        self.add_edge("elem_column", "mat_fly_ash_f", "ALLOWS_SCM", max_pct=25.0)
        self.add_edge("elem_column", "mat_pce_admixture", "ALLOWS_SCM")

        # Edges: Connect Beam & Slab
        self.add_edge("elem_beam_slab", "std_eit_1014", "GOVERNED_BY")
        self.add_edge("elem_beam_slab", "std_trees_leed", "GOVERNED_BY")
        self.add_edge("elem_beam_slab", "cst_moist_curing_7d", "MANDATES")
        self.add_edge("elem_beam_slab", "mat_hydraulic_cement", "ALLOWS_SCM")
        self.add_edge("elem_beam_slab", "mat_fly_ash_f", "ALLOWS_SCM", max_pct=30.0)

        # Edges: Connect Materials to Standards
        self.add_edge("mat_fly_ash_f", "std_tis_2135", "CERTIFIED_BY")
        self.add_edge("mat_fly_ash_f", "std_astm_c618", "CERTIFIED_BY")
        self.add_edge("mat_hydraulic_cement", "std_tis_2594", "CERTIFIED_BY")
        self.add_edge("mat_bottom_ash", "std_tis_2601", "CERTIFIED_BY")
        self.add_edge("mat_pce_admixture", "std_astm_c494", "CERTIFIED_BY")

    def _normalize_element(self, element_type: str) -> str:
        elem = element_type.lower()
        if "mat" in elem or "footing" in elem or "mass" in elem:
            return "elem_mat_foundation"
        elif "pt" in elem or "post" in elem:
            return "elem_pt_slab"
        elif "column" in elem or "wall" in elem:
            return "elem_column"
        return "elem_beam_slab"

    def get_element_subgraph(self, element_type: str) -> Dict[str, Any]:
        elem_node_id = self._normalize_element(element_type)
        elem_node = self.nodes.get(elem_node_id)

        standards = []
        constraints = []
        allowed_materials = []
        restricted_materials = []

        for edge in self.edges:
            if edge.source == elem_node_id:
                target_node = self.nodes.get(edge.target)
                if not target_node:
                    continue
                if target_node.node_type == "standard":
                    standards.append(target_node.label)
                elif target_node.node_type == "constraint":
                    constraints.append(target_node.label)
                elif target_node.node_type == "material":
                    if edge.relation == "RESTRICTS":
                        restricted_materials.append(f"{target_node.label} (จำกัดไม่เกิน {edge.properties.get('max_pct', 20)}%)")
                    else:
                        allowed_materials.append(target_node.label)

        # Match certified products from catalog connected to this element
        catalog = get_catalog()
        products = []
        target_token = "mat_foundation" if "mat" in elem_node_id else ("pt_slab" if "pt" in elem_node_id else ("column" if "column" in elem_node_id else "beam_slab"))
        for p in catalog:
            if target_token in p.suitable_elements or "general" in p.suitable_elements:
                products.append(p.to_dict())

        return {
            "element": elem_node.label if elem_node else element_type,
            "standards": standards,
            "constraints": constraints,
            "allowed_materials": allowed_materials,
            "restricted_materials": restricted_materials,
            "recommended_products": products
        }

    def explain_chain(self, element_type: str, target_material: str) -> str:
        elem_node_id = self._normalize_element(element_type)
        if elem_node_id == "elem_mat_foundation":
            return (
                "การให้เหตุผลทางวิศวกรรมโยธา (Knowledge Graph Chain):\n"
                "1. [โครงสร้าง: ฐานรากแผ่/Mat Foundation] เข้าข่ายความหนา >= 1.0 ม. (Mass Concrete)\n"
                "2. [ข้อกำหนด: ACI 207 & วสท. 1014] กำหนดให้ต้องควบคุมความร้อนไฮเดรชัน (Thermal Cracking Control) โดยผลต่างอุณหภูมิ Delta T <= 20 deg C และอุณหภูมิแกนกลาง < 70 deg C ป้องกัน DEF\n"
                "3. [วัสดุที่แนะนำ]: เถ้าลอย มอก. 2135 ชั้น F (TIS_2135_FlyAsh / ASTM C618) สัดส่วน 25-40% ร่วมกับน้ำยา PCE Superplasticizer ช่วยลดความร้อนไฮเดรชันได้อย่างมีนัยสำคัญ\n"
                "4. [เกณฑ์ตรวจรับ]: อนุญาตให้ทดสอบกำลังอัดที่อายุ 56 วัน (f'c,56) ตาม ACI 207 และ มยผ. 1101\n"
                "5. [สินค้าที่รองรับ]: CPAC Low Heat Low Carbon Concrete f'c 40 MPa @ 56 Days หรือ เถ้าลอยแม่เมาะ กฟผ."
            )
        elif elem_node_id == "elem_pt_slab":
            return (
                "การให้เหตุผลทางวิศวกรรมโยธา (Knowledge Graph Chain):\n"
                "1. [โครงสร้าง: แผ่นพื้น Post-Tensioned] ต้องการกำลังอัดต้นอย่างรวดเร็ว (Early-age strength >= 18-24 MPa ที่ 3-7 วัน) สำหรับดึงลวดอัดแรง\n"
                "2. [ข้อกำหนด: ACI 318 & วสท. 1014] ห้ามใช้สารปอซโซลานในสัดส่วนสูงเกินไปเพราะจะชะลอการพัฒนากำลังต้น\n"
                "3. [กฎข้อจำกัด]: จำกัดสัดส่วนเถ้าลอยไม่เกิน 20% หรือใช้ปูนซีเมนต์ไฮดรอลิก มอก. 2594 เป็นหลัก ร่วมกับสารลดน้ำ PCE\n"
                "4. [สินค้าที่รองรับ]: CPAC Low Carbon Concrete f'c 32/35 MPa หรือ INSEE Eco-Concrete"
            )
        return (
            "การให้เหตุผลทางวิศวกรรมโยธา (Knowledge Graph Chain):\n"
            "1. [โครงสร้างทั่วไป] ควบคุมตาม วสท. 1014 และ มยผ. 1101\n"
            "2. [วัสดุ]: อนุญาตปูนซีเมนต์ไฮดรอลิก มอก. 2594 หรือเถ้าลอย มอก. 2135 สัดส่วน 20-25%\n"
            "3. [การบ่ม]: ต้องบ่มชื้นต่อเนื่องอย่างน้อย 7 วัน (14 วันสำหรับสูตรผสมเถ้าลอย)"
        )

    def to_graph_rag_context(self, element_type: str) -> str:
        subgraph = self.get_element_subgraph(element_type)
        return f"""
[KNOWLEDGE GRAPH VERIFIED FACTS]
- โครงสร้าง: {subgraph['element']}
- มาตรฐานที่บังคับใช้: {', '.join(subgraph['standards'])}
- ข้อจำกัดทางโครงสร้าง: {', '.join(subgraph['constraints'])}
- วัสดุที่อนุญาต: {', '.join(subgraph['allowed_materials'])}
{('- วัสดุที่จำกัดสิทธิ์: ' + ', '.join(subgraph['restricted_materials'])) if subgraph['restricted_materials'] else ''}
"""
