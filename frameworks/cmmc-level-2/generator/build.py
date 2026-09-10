import json, sys
sys.path.insert(0, '/private/tmp/claude-501/-Users-chris-Code-comp/a0fe0e29-c24d-4821-b750-359c9a908dc2/scratchpad/cmmc')
from practices import PRACTICES, FAMILIES

fam_by_prefix = {pre: (abbr, name) for abbr, name, pre in FAMILIES}
def prefix(nid): return '.'.join(nid.split('.')[:2])

# ---- requirements (index order == PRACTICES order) ----
requirements, idx_by_nist = [], {}
for i, (nid, title, desc) in enumerate(PRACTICES):
    abbr, fname = fam_by_prefix[prefix(nid)]
    idx_by_nist[nid] = i
    requirements.append({
        "name": title,
        "identifier": f"{abbr}.L2-{nid}",
        "description": desc,
        "requirementFamily": f"{abbr} - {fname}",
        "sortOrder": i,
    })

# ---- policy templates: one per family ----
POLICIES = [
 ("AC","Access Control Policy","Governs how access to systems and CUI is authorized, provisioned, reviewed, and revoked, including least privilege, separation of duties, remote access, wireless, and external systems.","yearly","it"),
 ("AT","Security Awareness and Training Policy","Establishes security awareness and role-based training requirements, including insider threat recognition and reporting.","yearly","hr"),
 ("AU","Audit Logging and Accountability Policy","Defines what events are logged, how logs are protected and retained, and how audit records are reviewed and correlated.","yearly","it"),
 ("CM","Configuration Management Policy","Defines baseline configurations, change control, security impact analysis, least functionality, and software restrictions.","yearly","it"),
 ("IA","Identification and Authentication Policy","Defines identity management, multifactor authentication, and password and identifier lifecycle requirements.","yearly","it"),
 ("IR","Incident Response Policy","Establishes the incident handling capability, reporting obligations, and testing of response procedures.","yearly","it"),
 ("MA","System Maintenance Policy","Governs local and nonlocal maintenance, maintenance tooling, personnel supervision, and sanitization of equipment removed for service.","yearly","it"),
 ("MP","Media Protection Policy","Governs marking, storage, access, transport, sanitization, and disposal of media containing CUI, including removable media and backups.","yearly","it"),
 ("PS","Personnel Security Policy","Defines pre-authorization screening and protection of CUI during and after terminations and transfers.","yearly","hr"),
 ("PE","Physical Protection Policy","Governs physical access authorization, visitor escort, access device management, facility monitoring, and alternate work sites.","yearly","admin"),
 ("RA","Risk Assessment Policy","Defines periodic risk assessment, vulnerability scanning cadence, and risk-based remediation of findings.","yearly","gov"),
 ("CA","Security Assessment Policy","Defines periodic control assessment, continuous monitoring, plans of action, and maintenance of the system security plan.","yearly","gov"),
 ("SC","System and Communications Protection Policy","Governs boundary protection, network segmentation, cryptographic protection of CUI in transit and at rest, key management, and session integrity.","yearly","it"),
 ("SI","System and Information Integrity Policy","Governs flaw remediation, malicious code protection, security alert handling, and system monitoring for attacks and unauthorized use.","yearly","it"),
]
policy_templates = [{"name":n,"description":d,"frequency":f,"department":dept} for _,n,d,f,dept in POLICIES]
pol_idx = {abbr:i for i,(abbr,_,_,_,_) in enumerate(POLICIES)}

# ---- task templates ----
TASKS = [
 ("AC","Review user access and privileges","Recertify user accounts, roles, and privileged access; remove access no longer required.","quarterly","it"),
 ("AC","Review remote access configurations","Verify remote access routes through managed access control points and that encryption is enforced.","quarterly","it"),
 ("AT","Deliver security awareness training","Deliver and record annual awareness training, including insider threat indicators.","yearly","hr"),
 ("AU","Review and update logged events","Review the set of logged event types and adjust to current threat and audit needs.","quarterly","it"),
 ("AU","Review audit records for anomalies","Review correlated audit records for unlawful, unauthorized, suspicious, or unusual activity.","monthly","it"),
 ("CM","Review baseline configurations","Verify system baselines and inventory remain accurate and hardening settings are enforced.","quarterly","it"),
 ("CM","Review user-installed software","Audit installed software against the approved list and remove unauthorized applications.","quarterly","it"),
 ("IA","Validate MFA enrollment coverage","Confirm multifactor authentication is enforced for privileged and network accounts.","quarterly","it"),
 ("IR","Test the incident response plan","Exercise the incident response capability and record results and corrective actions.","yearly","it"),
 ("MA","Review maintenance activity records","Verify maintenance was authorized, supervised where required, and equipment sanitized before off-site service.","quarterly","it"),
 ("MP","Sanitize and dispose of media","Sanitize or destroy media containing CUI before disposal or reuse and record the disposition.","quarterly","it"),
 ("MP","Verify backup protection","Confirm backups containing CUI are encrypted and access to backup locations is restricted.","quarterly","it"),
 ("PS","Review screening and offboarding records","Confirm screening was completed before access was granted and access was revoked on termination or transfer.","quarterly","hr"),
 ("PE","Review physical access logs","Review facility access logs for unauthorized or anomalous entry.","monthly","admin"),
 ("PE","Review physical access devices","Inventory and reconcile keys, badges, and other physical access devices.","quarterly","admin"),
 ("RA","Conduct vulnerability scans","Scan systems and applications for vulnerabilities and record results.","monthly","it"),
 ("RA","Remediate identified vulnerabilities","Remediate or formally accept vulnerabilities according to assessed risk.","monthly","it"),
 ("RA","Perform organizational risk assessment","Assess risk to operations, assets, and individuals from systems processing CUI.","yearly","gov"),
 ("CA","Assess security controls","Assess control effectiveness and document findings.","yearly","gov"),
 ("CA","Update the system security plan","Review and update the SSP covering boundaries, environment, and control implementation.","yearly","gov"),
 ("CA","Review plan of action and milestones","Review POA&M items for progress and closure evidence.","quarterly","gov"),
 ("SC","Review boundary and firewall rules","Verify deny-by-default rules and review exceptions at network boundaries.","quarterly","it"),
 ("SC","Review cryptographic key management","Review key generation, rotation, storage, and retirement practices.","yearly","it"),
 ("SI","Update malicious code protection","Confirm anti-malware definitions and engines are current across managed endpoints.","monthly","it"),
 ("SI","Review system monitoring alerts","Review monitoring alerts for attacks, indicators of attack, and unauthorized use.","monthly","it"),
]
task_templates = [{"name":n,"description":d,"frequency":f,"department":dept,"automationStatus":"MANUAL"} for _,n,d,f,dept in TASKS]
def tasks_for(abbr): return [i for i,(a,_,_,_,_) in enumerate(TASKS) if a == abbr]

# ---- control templates ----
CONTROLS = [
 ("AC","Account Authorization and Least Privilege","Authorize accounts and devices, restrict permitted transactions and functions, separate duties, and enforce least privilege including use of non-privileged accounts for nonsecurity functions.",["3.1.1","3.1.2","3.1.4","3.1.5","3.1.6","3.1.7"]),
 ("AC","Session and Logon Controls","Limit unsuccessful logon attempts, present required notices, and lock or terminate sessions after inactivity or defined conditions.",["3.1.8","3.1.9","3.1.10","3.1.11"]),
 ("AC","Remote Access Management","Monitor and control remote access, encrypt remote sessions, route through managed access control points, and authorize privileged remote actions.",["3.1.12","3.1.13","3.1.14","3.1.15"]),
 ("AC","Wireless and Mobile Device Access","Authorize and protect wireless access, control mobile device connections, and encrypt CUI on mobile platforms.",["3.1.16","3.1.17","3.1.18","3.1.19"]),
 ("AC","External Systems and CUI Flow Control","Control the flow of CUI, verify and limit use of external systems and portable storage, and control CUI on publicly accessible systems.",["3.1.3","3.1.20","3.1.21","3.1.22"]),
 ("AT","Security Awareness and Role-Based Training","Make personnel aware of security risks and applicable policy, train them for their assigned security duties, and cover insider threat indicators.",["3.2.1","3.2.2","3.2.3"]),
 ("AU","Audit Logging and User Accountability","Create and retain audit logs sufficient for investigation, uniquely attribute actions to users, and review the set of logged events.",["3.3.1","3.3.2","3.3.3"]),
 ("AU","Audit Monitoring, Correlation, and Reporting","Alert on logging failures, correlate records for investigation, support on-demand reporting, and synchronize clocks to an authoritative time source.",["3.3.4","3.3.5","3.3.6","3.3.7"]),
 ("AU","Audit Information Protection","Protect audit records and tooling from unauthorized access, modification, and deletion, and restrict who can manage logging.",["3.3.8","3.3.9"]),
 ("CM","Baseline Configuration and Inventory","Establish and maintain baseline configurations and inventories and enforce security configuration settings across IT products.",["3.4.1","3.4.2"]),
 ("CM","Change Control and Security Impact Analysis","Track, review, and approve changes, analyze security impact before implementation, and enforce access restrictions for change.",["3.4.3","3.4.4","3.4.5"]),
 ("CM","Least Functionality and Software Restriction","Provide only essential capabilities, disable nonessential services and ports, enforce allow/deny listing, and control user-installed software.",["3.4.6","3.4.7","3.4.8","3.4.9"]),
 ("IA","Identification and Authentication of Users and Devices","Identify users, processes, and devices, authenticate them before granting access, and obscure authentication feedback.",["3.5.1","3.5.2","3.5.11"]),
 ("IA","Multifactor and Replay-Resistant Authentication","Require MFA for privileged and network access and employ replay-resistant authentication mechanisms.",["3.5.3","3.5.4"]),
 ("IA","Identifier and Password Lifecycle Management","Manage identifier reuse and inactivity disabling, and enforce password complexity, reuse limits, temporary password handling, and cryptographic protection.",["3.5.5","3.5.6","3.5.7","3.5.8","3.5.9","3.5.10"]),
 ("IR","Incident Response Capability","Maintain an operational incident handling capability covering preparation through recovery, report incidents to designated authorities, and test the capability.",["3.6.1","3.6.2","3.6.3"]),
 ("MA","System Maintenance Controls","Perform and control system maintenance, sanitize equipment removed off-site, inspect diagnostic media, require MFA for nonlocal maintenance, and supervise unescorted maintenance personnel.",["3.7.1","3.7.2","3.7.3","3.7.4","3.7.5","3.7.6"]),
 ("MP","Media Handling, Marking, and Accountability","Physically control and securely store media containing CUI, limit access to authorized users, apply required markings, and maintain accountability during transport.",["3.8.1","3.8.2","3.8.4","3.8.5"]),
 ("MP","Media Sanitization and Disposal","Sanitize or destroy media containing CUI before disposal or release for reuse.",["3.8.3"]),
 ("MP","Removable Media and Backup Protection","Encrypt CUI on digital media in transport, control removable media use, prohibit unowned portable devices, and protect backup confidentiality.",["3.8.6","3.8.7","3.8.8","3.8.9"]),
 ("PS","Personnel Screening and Access Changes","Screen individuals before authorizing access to CUI and protect systems during and after terminations and transfers.",["3.9.1","3.9.2"]),
 ("PE","Physical Access Authorization and Devices","Limit physical access to authorized individuals, escort and monitor visitors, and control and manage physical access devices.",["3.10.1","3.10.3","3.10.5"]),
 ("PE","Facility Monitoring and Access Logging","Protect and monitor the physical facility and supporting infrastructure and maintain physical access audit logs.",["3.10.2","3.10.4"]),
 ("PE","Alternate Work Site Safeguards","Enforce safeguarding measures for CUI at alternate work sites.",["3.10.6"]),
 ("RA","Organizational Risk Assessment","Periodically assess risk to operations, assets, and individuals arising from systems that process, store, or transmit CUI.",["3.11.1"]),
 ("RA","Vulnerability Scanning and Remediation","Scan for vulnerabilities periodically and on new disclosures, and remediate in accordance with assessed risk.",["3.11.2","3.11.3"]),
 ("CA","Control Assessment and Continuous Monitoring","Periodically assess control effectiveness and monitor controls on an ongoing basis.",["3.12.1","3.12.3"]),
 ("CA","Plans of Action and System Security Planning","Maintain plans of action to correct deficiencies and develop and update system security plans describing boundaries and control implementation.",["3.12.2","3.12.4"]),
 ("SC","Boundary Protection and Network Segmentation","Monitor and protect communications at external and key internal boundaries, isolate publicly accessible components, deny traffic by default, and prevent split tunneling.",["3.13.1","3.13.5","3.13.6","3.13.7"]),
 ("SC","Secure Architecture and Functional Separation","Apply security engineering principles, separate user from management functionality, and prevent unauthorized transfer via shared resources.",["3.13.2","3.13.3","3.13.4"]),
 ("SC","Cryptographic Protection of CUI","Encrypt CUI in transit and at rest, employ FIPS-validated cryptography, and manage cryptographic keys.",["3.13.8","3.13.10","3.13.11","3.13.16"]),
 ("SC","Session and Communications Integrity","Terminate sessions at end or after inactivity and protect the authenticity of communications sessions.",["3.13.9","3.13.15"]),
 ("SC","Collaborative Computing, Mobile Code, and VoIP","Prohibit remote activation of collaborative computing devices, indicate device use, and control and monitor mobile code and VoIP.",["3.13.12","3.13.13","3.13.14"]),
 ("SI","Flaw Remediation and Security Alerting","Identify, report, and correct system flaws in a timely manner and act on security alerts and advisories.",["3.14.1","3.14.3"]),
 ("SI","Malicious Code Protection","Provide malicious code protection at designated locations, keep mechanisms updated, and perform periodic and real-time scanning.",["3.14.2","3.14.4","3.14.5"]),
 ("SI","System Monitoring and Unauthorized Use Detection","Monitor systems and inbound/outbound traffic for attacks and identify unauthorized use.",["3.14.6","3.14.7"]),
]
control_templates = []
for abbr, name, desc, nids in CONTROLS:
    fname = fam_by_prefix[[p for p,(a,_) in fam_by_prefix.items() if a==abbr][0]][1]
    control_templates.append({
        "name": name,
        "description": desc,
        "controlFamily": f"{abbr} - {fname}",
        "requirementIndices": [idx_by_nist[n] for n in nids],
        "policyTemplateIndices": [pol_idx[abbr]],
        "taskTemplateIndices": tasks_for(abbr),
    })

payload = {
    "version": "1",
    "framework": {
        "name": "CMMC Level 2",
        "version": "2.0",
        "description": "Cybersecurity Maturity Model Certification (CMMC) 2.0 Level 2 — 110 practices for the protection of Controlled Unclassified Information (CUI), aligned to NIST SP 800-171 Rev 2.",
        "visible": True,
    },
    "requirements": requirements,
    "policyTemplates": policy_templates,
    "taskTemplates": task_templates,
    "controlTemplates": control_templates,
}

# ---- coverage check: every requirement must be covered by >=1 control ----
covered = set()
for ct in control_templates: covered.update(ct["requirementIndices"])
missing = [requirements[i]["identifier"] for i in range(len(requirements)) if i not in covered]

out = '/private/tmp/claude-501/-Users-chris-Code-comp/a0fe0e29-c24d-4821-b750-359c9a908dc2/scratchpad/cmmc/payload.json'
json.dump(payload, open(out,'w'), indent=2)
print(f"requirements      : {len(requirements)}")
print(f"control templates : {len(control_templates)}")
print(f"policy templates  : {len(policy_templates)}")
print(f"task templates    : {len(task_templates)}")
print(f"uncovered reqs    : {len(missing)} {missing if missing else ''}")
print(f"written           : {out}")
