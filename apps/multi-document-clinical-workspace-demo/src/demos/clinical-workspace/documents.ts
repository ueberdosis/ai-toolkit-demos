/** Fictional study materials with deliberate discrepancies for cross-document review. */
export const clinicalDocuments = [
  {
    id: "protocol",
    title: "Clinical trial protocol",
    mention: "Protocol",
    detail: "Version 3.0 · source of truth for study design",
    content: `<h1>LUMEN-204 clinical trial protocol</h1>
<p><strong>Protocol AP-204-02 · Version 3.0 · 12 November 2026</strong></p>
<p>Sponsor: Asterion Pharma. Investigational product: lumetraban (AP-204). Phase IIb, randomized, double-blind, placebo-controlled study in adults with moderately active ulcerative colitis. These fictional materials are for software demonstration only.</p>
<h2>1. Rationale and objectives</h2>
<p>Lumetraban is an investigational oral small molecule intended to modulate inflammatory signaling in the intestinal mucosa. An earlier exploratory study supported further evaluation of clinical activity, but its size and duration do not establish efficacy or long-term safety. This study will estimate the benefit-risk profile of two doses and inform the design of a confirmatory trial.</p>
<p>The primary objective is to compare clinical remission at week 12 between lumetraban and placebo. Secondary objectives include endoscopic improvement, change in rectal bleeding and stool frequency, patient-reported fatigue, and treatment-emergent adverse events. No therapeutic benefit is guaranteed to participants.</p>
<h2>2. Study design and population</h2>
<p>Approximately 240 adults will be randomized 1:1:1 to lumetraban 50 mg, lumetraban 100 mg, or matching placebo, taken once daily for 12 weeks. Randomization will be stratified by prior biologic exposure and baseline disease severity. Participants, investigators, site staff, and the sponsor study team will remain blinded until database lock, except for designated safety personnel.</p>
<p>Eligible participants are 18–75 years old, have a confirmed diagnosis of ulcerative colitis for at least three months, and have a modified Mayo score of 5–9 with an endoscopic subscore of at least 2. Oral corticosteroids must be stable for at least two weeks before baseline. Key exclusions include active serious infection, clinically significant hepatic disease, pregnancy, and use of another investigational product within 30 days.</p>
<h2>3. Visits and assessments</h2>
<p>Screening occurs from day −28 to day −1. On-site visits occur at baseline and weeks 2, 4, 8, and 12, with a safety follow-up at week 16. Each treatment visit includes adverse-event review, concomitant medication review, vital signs, and hematology and chemistry sampling. Endoscopy is performed at screening and week 12, with central blinded reading.</p>
<p>Participants complete a daily electronic diary for stool frequency and rectal bleeding. Sites should contact participants after three consecutive missing diary days. Study medication adherence is assessed using tablet counts and diary entries; missed doses must not be doubled.</p>
<h2>4. Safety oversight</h2>
<p>Investigators must report serious adverse events to the sponsor within 24 hours of awareness, irrespective of suspected causality. A follow-up report should provide available clinical details without delaying the initial notification. An independent data monitoring committee reviews unblinded aggregate safety data at prespecified intervals.</p>
<p>Study medication must be interrupted for ALT or AST greater than five times the upper limit of normal, or greater than three times the upper limit with bilirubin greater than twice the upper limit. The investigator will assess alternative causes and discuss any proposed restart with the medical monitor. Participants may withdraw consent at any time without affecting routine care.</p>
<h2>5. Analysis and data handling</h2>
<p>The primary analysis population includes all randomized participants. Clinical remission requires a rectal bleeding subscore of 0, stool frequency subscore of 0 or 1, and endoscopic subscore of 0 or 1 excluding friability. Missing week-12 assessments will be treated as nonresponse. Multiplicity and intercurrent events are specified in the statistical analysis plan.</p>
<p>Source records remain at the site. Coded study data are entered into validated electronic systems and reviewed through risk-based monitoring. Direct identifiers must not appear in sponsor analysis datasets. Protocol amendments require applicable ethics and regulatory approval before implementation, except when needed to eliminate an immediate hazard.</p>`,
  },
  {
    id: "consent",
    title: "Participant information & consent",
    mention: "Consent",
    detail: "Version 2.1 · participant-facing language",
    content: `<h1>Taking part in the LUMEN-204 study</h1>
<p><strong>Participant information and consent · Version 2.1 · 28 October 2026</strong></p>
<p>Sponsor: Asterion Pharma. Study medicine: lumetraban. Please read this information carefully and discuss it with people you trust. Ask the study team about anything that is unclear. This is a fictional example and is not a consent form for an actual trial.</p>
<h2>Why are we doing this study?</h2>
<p>We are studying a new medicine for ulcerative colitis, a condition that causes inflammation in the large bowel. We want to learn whether lumetraban improves symptoms and how safe it is. Lumetraban is experimental and has not been approved to treat your condition. About 240 people will take part.</p>
<h2>What will happen if I join?</h2>
<p>A computer will assign you by chance to one of three groups. You will receive 50 mg of lumetraban, 100 mg of lumetraban, or a placebo once a day for 12 weeks. A placebo looks like the study medicine but has no active ingredient. You have an equal chance of joining each group. Neither you nor your usual study doctor will know which group you are in, unless that information is needed for your safety.</p>
<p>Before treatment, the team will check whether the study is suitable for you. You will visit the clinic at the start and at weeks 4, 8, and 12. There is one final safety visit at week 16. Visits include questions about your health, blood tests, and checks of your blood pressure and pulse. You will have a bowel examination with a flexible camera before treatment and again at week 12. The team will explain preparation, sedation options, and the risks of this procedure separately.</p>
<p>You will record bowel movements and bleeding in a short electronic diary each day. Please bring unused tablets to each visit. If you miss a dose, do not take two doses together. Tell the study team about all medicines and supplements you take, and discuss any new medicine with them first.</p>
<h2>What are the risks and possible benefits?</h2>
<p>You may experience nausea, headache, infection, or changes in liver blood tests. Other effects may be unknown. Blood sampling can cause bruising or faintness, and bowel examinations can cause discomfort, bleeding, or, rarely, injury to the bowel. Contact the study team promptly if you feel unwell. Seek emergency care for severe symptoms and tell the treating clinician that you are in a study.</p>
<p>The study medicine will improve your symptoms and may reduce the need for your other treatment. Information from this study may help future patients. Your doctor can explain alternatives, including continuing your current care or choosing another approved treatment.</p>
<h2>Do I have to take part?</h2>
<p>No. Taking part is your choice. You can stop at any time without giving a reason, and your usual care will not be affected. The study doctor may stop your treatment if continuing would be unsafe. With your permission, the team may ask you to attend a final safety check even if you stop taking the medicine.</p>
<h2>How will my information be used?</h2>
<p>The study team will replace your name with a study code in records sent to the sponsor. Authorized monitors, ethics committees, and regulators may review medical records to check that the study is conducted correctly. Reports will not identify you. Ask the team about local privacy rights, retention periods, reimbursement, and whom to contact with concerns before signing.</p>
<h2>Consent discussion</h2>
<p>I have had time to consider this information, ask questions, and discuss alternatives. I understand that participation is voluntary. The site will record the participant name, signature, date, and the name and signature of the person taking consent on the locally approved form. A copy of the signed form will be provided to the participant.</p>`,
  },
  {
    id: "safety",
    title: "Safety monitoring plan",
    mention: "Safety",
    detail: "Version 1.4 · site and medical monitor procedures",
    content: `<h1>LUMEN-204 safety monitoring plan</h1>
<p><strong>AP-204-02 · Version 1.4 · 30 October 2026</strong></p>
<p>This fictional operational plan describes safety surveillance for the lumetraban phase IIb study. It is used by site investigators, clinical research associates, pharmacovigilance staff, and the sponsor medical monitor. The approved protocol takes precedence if operational instructions conflict.</p>
<h2>1. Roles and responsibilities</h2>
<p>The principal investigator is responsible for participant safety at the site and for ensuring that delegated staff are trained. The medical monitor provides clinical advice and reviews emerging signals. Pharmacovigilance staff assess seriousness, expectedness, and reportability under applicable requirements. Safety decisions must be documented in source records and the study safety system.</p>
<p>The independent data monitoring committee has access to unblinded safety summaries under a separate charter. Routine sponsor operations remain blinded. Emergency unblinding is permitted only when knowledge of treatment is necessary for clinical management; the reason, date, and personnel involved must be recorded.</p>
<h2>2. Routine surveillance</h2>
<p>At baseline and weeks 2, 4, 8, and 12, sites review adverse events, concomitant medication, vital signs, hematology, renal function, and liver chemistry. A week-16 visit assesses events after treatment ends. Clinically significant abnormalities require follow-up until resolution, stabilization, or a documented alternative explanation.</p>
<p>Participants receive a 24-hour site contact number and instructions to seek emergency care when appropriate. Site staff should ask open-ended questions before using targeted prompts about infection, abdominal symptoms, or symptoms of liver injury. Record onset, severity, action taken, outcome, and investigator assessment of causality.</p>
<h2>3. Serious adverse events</h2>
<p>Report serious adverse events to the sponsor safety team within 48 hours of site awareness. Seriousness includes death, a life-threatening event, inpatient hospitalization or prolonged hospitalization, persistent significant disability, congenital anomaly, or another medically important event. Do not wait for complete records before submitting the initial report.</p>
<p>Send follow-up information as it becomes available, including discharge summaries and relevant laboratory results with direct identifiers removed. The investigator remains responsible for appropriate medical care. The sponsor safety team determines expedited reporting obligations and coordinates submissions; sites follow local requirements for ethics notifications.</p>
<h2>4. Liver safety management</h2>
<p>Interrupt study medication if ALT or AST exceeds five times the upper limit of normal, or exceeds three times the upper limit with bilirubin above twice the upper limit. Arrange repeat testing promptly, assess symptoms and other potential causes, and contact the medical monitor. Do not restart treatment without documented discussion and a clinical rationale.</p>
<p>Symptoms such as jaundice, dark urine, persistent vomiting, or marked fatigue require urgent clinical assessment. The investigator may interrupt treatment earlier when clinically warranted. Record any hospital attendance as a separate event and assess whether seriousness criteria are met.</p>
<h2>5. Pregnancy, infection, and follow-up</h2>
<p>Study medication must be stopped if pregnancy is confirmed. Report pregnancy to the sponsor and arrange follow-up with the participant's permission under local requirements. Serious infection requires interruption pending clinical assessment. Decisions about permanent discontinuation must consider the protocol and participant's interests.</p>
<p>Events ongoing at the final visit should be followed by the site until the investigator determines that further study follow-up is no longer clinically necessary. Participants who discontinue treatment should be offered the scheduled safety assessments. Withdrawal of consent for further contact must be respected and documented.</p>
<h2>6. Quality controls</h2>
<p>The clinical research associate reconciles safety events between the clinical database and safety system at least monthly and before database lock. The study team reviews overdue follow-up, missing laboratory results, and reporting timeliness. Deviations are assessed for impact and addressed through targeted retraining and corrective action.</p>`,
  },
  {
    id: "analysis",
    title: "Statistical analysis plan",
    mention: "Analysis",
    detail: "Version 1.0 · endpoints and analysis populations",
    content: `<h1>LUMEN-204 statistical analysis plan</h1>
<p><strong>AP-204-02 · Version 1.0 · 2 November 2026</strong></p>
<p>This fictional plan prespecifies analyses for the randomized phase IIb lumetraban trial. It will be finalized before database lock and unblinding. Changes after unblinding will be labeled exploratory and justified in the clinical study report. No results in these materials represent actual clinical evidence.</p>
<h2>1. Study overview</h2>
<p>The study randomizes approximately 240 adults equally to lumetraban 50 mg, lumetraban 100 mg, or placebo for 12 weeks. Randomization is stratified by prior biologic exposure and baseline disease severity. The primary comparison evaluates each active dose against placebo. The study is intended to support dose selection and planning rather than establish definitive clinical benefit.</p>
<h2>2. Analysis populations</h2>
<p>The full analysis set includes every randomized participant, analyzed according to assigned treatment. The safety set includes participants who receive at least one dose, analyzed according to treatment received. A per-protocol set will exclude prespecified major deviations, classified before unblinding without reference to treatment outcomes. Reasons for exclusion will be summarized by group.</p>
<p>Baseline is the last nonmissing assessment before the first dose. Demographic and disease characteristics will be described using counts, percentages, means, standard deviations, medians, and ranges as appropriate. No significance testing of baseline differences is planned.</p>
<h2>3. Primary endpoint and estimand</h2>
<p>The primary endpoint is clinical remission at week 10, defined by a rectal bleeding subscore of 0, stool frequency subscore of 0 or 1, and endoscopic subscore of 0 or 1 excluding friability. The population is adults meeting the protocol eligibility criteria. The treatment condition is assignment to 12 weeks of lumetraban or placebo in addition to permitted background therapy.</p>
<p>Participants with missing primary assessments will be classified as nonresponders. Rescue medication and treatment discontinuation due to lack of efficacy will be handled using a composite nonresponse strategy. Other intercurrent events and visit windows will be classified in a blinded data review and listed in the analysis specification.</p>
<h2>4. Primary analysis</h2>
<p>Compare remission proportions using a stratified method accounting for the randomization strata. Report treatment differences, two-sided 95% confidence intervals, and p-values. The family-wise two-sided type I error rate is 0.05; test the 100 mg comparison first, followed by the 50 mg comparison only if the first test is significant. All other analyses are supportive unless explicitly included in the testing hierarchy.</p>
<p>Sensitivity analyses will explore assumptions about missing assessments and intercurrent events. Present the number and reasons for missing data by treatment group. Any model convergence issues and alternative analysis methods must be documented before interpretation of results.</p>
<h2>5. Secondary and safety analyses</h2>
<p>Secondary endpoints include endoscopic improvement at week 12, change from baseline in symptom scores, and fatigue measures. Continuous outcomes will use a repeated-measures model where assumptions are appropriate. Report effect estimates and confidence intervals, with clear identification of exploratory comparisons.</p>
<p>Summarize treatment-emergent adverse events from first dose through the safety follow-up at week 16, including serious events, events leading to discontinuation, and events of special interest. Summarize laboratory shifts and potentially clinically significant liver abnormalities. Safety analyses are descriptive and do not establish absence of risk.</p>
<h2>6. Reporting conventions</h2>
<p>Tables will show denominators explicitly and distinguish zero events from missing information. Listings use coded participant identifiers only. The clinical study report will describe protocol deviations, analysis changes, and limitations alongside results. Independent programming checks will verify key derivations and all primary endpoint outputs before release.</p>`,
  },
] as const;

export type ClinicalDocumentId = (typeof clinicalDocuments)[number]["id"];
