import json, sys
sys.path.insert(0,'/private/tmp/claude-501/-Users-chris-Code-comp/a0fe0e29-c24d-4821-b750-359c9a908dc2/scratchpad/cmmc')
from practices import PRACTICES, FAMILIES

p = '/private/tmp/claude-501/-Users-chris-Code-comp/a0fe0e29-c24d-4821-b750-359c9a908dc2/scratchpad/cmmc/payload.json'
payload = json.load(open(p))

fam_by_prefix = {pre:(abbr,name) for abbr,name,pre in FAMILIES}
def prefix(nid): return '.'.join(nid.split('.')[:2])

# practices grouped by family abbreviation
by_abbr = {}
for nid, title, desc in PRACTICES:
    abbr, _ = fam_by_prefix[prefix(nid)]
    by_abbr.setdefault(abbr, []).append((nid, title, desc))

def h(level, text):
    return {"type":"heading","attrs":{"level":level},"content":[{"type":"text","text":text}]}
def para(text):
    return {"type":"paragraph","content":[{"type":"text","text":text}]}
def bullets(items):
    return {"type":"bulletList","content":[
        {"type":"listItem","content":[para(t)]} for t in items]}

# policy order matches FAMILIES order in build.py
ORDER = [a for a,_,_ in FAMILIES]
for i, pol in enumerate(payload["policyTemplates"]):
    abbr = ORDER[i]
    _, fname = [(a,n) for a,n,_ in FAMILIES if a==abbr][0][0], [n for a,n,_ in FAMILIES if a==abbr][0]
    prac = by_abbr[abbr]
    pol["content"] = {"type":"doc","content":[
        h(1, pol["name"]),
        h(2, "Purpose"),
        para(pol["description"]),
        h(2, "Scope"),
        para("This policy applies to all personnel, contractors, systems, and facilities that store, process, or transmit Controlled Unclassified Information (CUI), and to the people and third parties acting on the organization's behalf."),
        h(2, "Policy Requirements"),
        para(f"The organization implements the following CMMC Level 2 practices in the {fname} domain:"),
        bullets([f"{abbr}.L2-{nid} — {desc}" for nid, _t, desc in prac]),
        h(2, "Roles and Responsibilities"),
        para("Control owners are accountable for implementing and evidencing the practices above. The security function reviews implementation at least annually and reports exceptions through the risk management process."),
        h(2, "Exceptions"),
        para("Exceptions require documented risk acceptance by the system owner and the security function, with a defined expiry and compensating controls where applicable."),
        h(2, "Review"),
        para("This policy is reviewed at least annually and after significant changes to the environment or to CMMC requirements."),
    ]}

json.dump(payload, open(p,'w'), indent=2)
tot = sum(len(x["content"]["content"]) for x in payload["policyTemplates"])
print(f"added content to {len(payload['policyTemplates'])} policies ({tot} total nodes)")
print("sample:", payload["policyTemplates"][0]["name"], "->",
      len(payload["policyTemplates"][0]["content"]["content"]), "nodes")
