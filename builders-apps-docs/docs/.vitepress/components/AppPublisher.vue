<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

// Registry address - update this after contract deployment
const REGISTRY_ADDRESS = ref('0xe8c84530749dd8294c635aa5af50d95025dc0261603cb83f69a608e1ded8eb0f')
const TEST_MODE = ref(false) // Toggle between mainnet and testnet

// App state
const connected = ref(false)
const walletAddress = ref('')
const walletName = ref('')
const developerApps = ref([])
const developerAppIndices = ref([]) // Store app indices alongside apps
const allActiveApps = ref([])
const loading = ref(false)
const error = ref('')
const success = ref('')
const activeTab = ref('submit') // 'submit' | 'my-apps' | 'browse'
const showWalletModal = ref(false)
const submissionFeeOctas = ref(0) // Fee in octas
const submissionFeeMOVE = computed(() => (submissionFeeOctas.value / 100000000).toFixed(0)) // Convert to MOVE
const editingAppIndex = ref<number | null>(null) // Track which app is being edited
const hasPendingChange = ref<Record<number, boolean>>({}) // Track pending changes per app

// Auto-dismiss messages after 8 seconds
let messageTimeout: NodeJS.Timeout | null = null
function showMessage(type: 'error' | 'success', message: string) {
  // Clear existing timeout
  if (messageTimeout) {
    clearTimeout(messageTimeout)
  }

  // Set message
  if (type === 'error') {
    error.value = message
    success.value = ''
  } else {
    success.value = message
    error.value = ''
  }

  // Scroll to the alert message after it renders
  nextTick(() => {
    const alertElement = document.querySelector('.alert')
    if (alertElement) {
      alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })

  // Auto-dismiss after 8 seconds
  messageTimeout = setTimeout(() => {
    error.value = ''
    success.value = ''
  }, 8000)
}

// Available wallets with their actual window object names
// Some wallets may be accessible via multiple keys (e.g., Petra via both 'aptos' and 'petra')
// For multi-chain wallets like Nightly, we need to access the chain-specific API (e.g., window.nightly.aptos)
const availableWallets = ref([
  {
    name: 'Nightly',
    icon: '/wallets/nightly_logo.png',
    windowKey: 'nightly',
    chainKey: 'aptos',
    available: false
  },
  {
    name: 'Razor',
    icon: '/wallets/razor.svg',
    windowKey: 'razor',
    available: false
  },
])

// Unsupported wallets to filter out (similar to staking site)
const unsupportedWallets = [
  'Dev T wallet',
  'Pontem Wallet',
  'Pontem',
  'TrustWallet',
  'TokenPocket',
  'Martian',
  'Rise',
  'Petra',
  'Aptos Connect',
  'Continue with Google',
  'Continue with Apple'
]

// Filter available wallets (remove unsupported ones)
const filteredWallets = computed(() => {
  return availableWallets.value.filter(wallet => {
    // Filter out unsupported wallets
    if (unsupportedWallets.includes(wallet.name)) {
      return false
    }
    // Filter out wallets with 'aptos connect' in name (case-insensitive)
    if (wallet.name.toLowerCase().includes('aptos connect')) {
      return false
    }
    return true
  })
})

// Terms agreement state
const termsAgreed = ref(false)
const showTermsModal = ref(false)

// Developer Agreement Text
const DEVELOPER_AGREEMENT_TEXT = `MOVEMENT
MINI APP DEVELOPER AGREEMENT

Effective Date: The date you click "I Agree," access the Developer Portal, or submit a Mini App for review (the "Effective Date").

By clicking "I Agree," accessing the Movement Developer Portal (the "Portal"), submitting a Mini App for review, or otherwise integrating or deploying a Mini App within the Movement SuperApp (the "App"), you ("Developer", "you", or "your") agree to be bound by this Agreement with Movement Network Foundation ("App Operator", "we", "us", or "our"), a Cayman Islands foundation company. If you are entering into this Agreement on behalf of a company or other legal entity, you represent that you have the authority to bind such entity. If you do not agree to all terms and conditions of this Agreement, you may not access the Portal or submit any Mini App.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ ARBITRATION NOTICE

THIS AGREEMENT CONTAINS AN ARBITRATION CLAUSE, WHICH IS CONTAINED BELOW UNDER THE HEADING "DISPUTE RESOLUTION." YOU AGREE THAT DISPUTES WILL BE RESOLVED BY BINDING ARBITRATION, AND YOU WAIVE YOUR RIGHT TO A TRIAL BY JURY OR TO PARTICIPATE AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS ACTION OR OTHER REPRESENTATIVE PROCEEDING.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DEFINITIONS

1.1 "Affiliate" means, with respect to any entity, any other entity that directly or indirectly controls, is controlled by, or is under common control with such entity.

1.2 "App" means the Movement SuperApp mobile application and related interfaces operated by App Operator, which serves as a non-custodial container for Mini Apps.

1.3 "App Operator Marks" means the trademarks, service marks, logos, and brand names of App Operator provided to Developer for integration purposes.

1.4 "Blockchain" means the Movement Network Layer-1 blockchain and any other public, permissionless blockchain network that the App supports for integration.

1.5 "Confidential Information" means any non-public information disclosed by one party to the other, whether orally or in writing, that is designated as confidential or reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.

1.6 "Digital Assets" means tokens, cryptocurrencies, stablecoins, non-fungible tokens (NFTs), and other blockchain-based digital assets.

1.7 "Indemnitees" means App Operator, its Affiliates, licensors, service providers, and their respective directors, officers, employees, agents, successors, and assigns.

1.8 "Mini App" means the blockchain-based application, smart contracts, user interface, content, and related services developed, owned, and operated by Developer for integration, display, and use within the App.

1.9 "Platform" or "Portal" means App Operator's proprietary developer portal, including all software, application programming interfaces (APIs), software development kits (SDKs), integration frameworks, hosting environment, documentation, and other tools made available to Developer for Mini App integration.

1.10 "Services" means the functionality provided to Developer, including Mini App submission, review, testing, deployment, analytics, and management tools.

1.11 "Term" means the period commencing on the Effective Date and continuing until this Agreement is terminated as set forth in Section 18.

1.12 "Terms of Service" means App Operator's Movement SuperApp Terms of Service, applicable to end users of the App, as amended from time to time.

1.13 "Users" means end users of the App who interact with Mini Apps.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. ACCEPTANCE, ELIGIBILITY, AND ACCOUNT

2.1 Acceptance of Terms. By clicking "I Agree," accessing the Portal, using any Services, or submitting a Mini App for review, you acknowledge that you have read, understood, and agree to be bound by this Agreement. This Agreement is a legally binding contract between you and App Operator. Your continued use of the Portal or Services constitutes ongoing acceptance of any modifications App Operator may make to this Agreement in accordance with Section 22.2.

2.2 Eligibility and Authority. You represent (a) you are at least the age of majority in your jurisdiction of residence and have full legal capacity to enter into this Agreement; (b) if you are accepting this Agreement on behalf of an entity, you have all necessary authority, power, and legal right to bind that entity; (c) you are not barred from using the Portal or Services under any applicable law, including sanctions and export control laws; and (d) neither you, nor any of your Affiliates, principals, officers, directors, or beneficial owners, is a Sanctioned Person or organized or resident in a Sanctioned Territory (as defined in Section 6.3).

2.3 Account Registration. To access the Portal and Services, you must create a Developer account using a valid email address. You agree to provide accurate, current, and complete information during registration and to update such information promptly to keep it accurate, current, and complete. We reserve the right to suspend or terminate your account if any information provided is inaccurate, untrue, or incomplete, or if you fail to comply with any account registration requirements.

2.4 Authorized Users. You may designate additional individuals as authorized users under your account ("Authorized Users"). Each Authorized User must agree to comply with this Agreement. You are fully responsible for all activities that occur under your account, including all actions taken by Authorized Users, regardless of whether such access was authorized by you or the applicable Authorized User. You agree to notify App Operator immediately of any unauthorized access to or use of your account or any other security breach.

2.5 Account Security. You are responsible for maintaining the confidentiality of your login credentials, API keys, Client IDs, and any other authentication mechanisms provided to you. You may not sell, sublicense, transfer, or otherwise disclose your credentials to any third party. You will implement and maintain reasonable security measures to protect your account from unauthorized access.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. PLATFORM AND SERVICES OVERVIEW

3.1 Description of Platform. The Platform provides qualified developers with the tools, APIs, SDKs, and infrastructure necessary to integrate Mini Apps for display and access within the App. The Platform includes submission and review interfaces, testing environments, analytics dashboards, and documentation. App Operator may modify, enhance, or retire any aspect of the Platform or Services at any time, with or without notice, and without liability to you.

3.2 Non-Custodial Architecture. You acknowledge and agree that the App and Platform operate exclusively as non-custodial software interfaces. App Operator does not at any time custody Digital Assets, store private keys, execute transactions, intermediate payments, match orders, operate an order book, provide custodial services, or act as a financial intermediary of any kind. All User interactions with your Mini App occur directly between the User (via their self-custody wallet) and your smart contracts, protocols, or designated services on a peer-to-protocol basis.

3.3 Independent Contractor Relationship. Developer is an independent contractor. Nothing in this Agreement creates any partnership, joint venture, agency, fiduciary relationship, employment relationship, or co-venture between App Operator and Developer. Developer has no authority to bind App Operator or make any representations on its behalf. Developer is solely responsible for its employees, contractors, taxes, benefits, and all other obligations associated with its business operations.

3.4 No Endorsement. Developer acknowledges that App Operator's acceptance of a Mini App for listing, its inclusion in the App, or any promotion or featuring of the Mini App does not constitute an endorsement, warranty, guarantee, or representation by App Operator regarding the Mini App's security, compliance, legality, performance, or suitability for any purpose. App Operator disclaims all responsibility and liability for the Mini App and its interactions with Users.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. MINI APP SUBMISSION, REVIEW, AND APPROVAL

4.1 Submission Requirements. To integrate a Mini App, Developer must submit a complete application via the Portal that includes all information and materials reasonably requested by App Operator, which may include: (a) a detailed description of the Mini App's functionality, purpose, and target audience; (b) technical specifications, including smart contract addresses on all relevant Blockchains; (c) Developer's end-user terms and privacy policy, if applicable; (d) compliance certifications and regulatory disclosures; (e) security audit reports from reputable third-party firms; (f) legal opinions regarding regulatory status in key jurisdictions; (g) fee and monetization disclosures; (h) branding and marketing materials; and (i) any other information App Operator deems necessary to evaluate the Mini App.

4.2 Review and Approval Process. App Operator may review all Mini App submissions for technical compatibility, security, compliance with applicable laws and policies, and overall fit with the App ecosystem. App Operator retains sole and absolute discretion to:
  (a) Accept, reject, or conditionally approve any Mini App submission;
  (b) Require modifications, additional documentation, security audits, or legal opinions as a condition of approval;
  (c) Impose specific requirements or restrictions on the Mini App's operation or presentation within the App;
  (d) Limit the jurisdictions in which the Mini App is made available; and
  (e) Re-review any previously approved Mini App at any time and require changes or removal.

4.3 No Guarantee of Listing. Approval of a Mini App does not guarantee its continued listing, any particular placement, ranking, or visibility within the App, or any level of User engagement, downloads, or transaction volume. App Operator controls all aspects of Mini App discovery, categorization, featuring, and promotion in its sole discretion.

4.4 Ongoing Monitoring and Audits. Developer grants App Operator the right to monitor the Mini App's performance, security, compliance, and User feedback on a continuous basis. App Operator may conduct or commission security testing, penetration testing, or compliance audits of the Mini App upon reasonable notice. Developer will provide all necessary access, information, and cooperation for such audits and will remediate any identified issues promptly at its own expense.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. DEVELOPER OBLIGATIONS

5.1 Accurate Disclosures. Developer must provide clear, accurate, and non-misleading information about the Mini App in all materials submitted to App Operator and displayed to Users. All descriptions must truthfully represent the Mini App's functionality, risks, tokenomics, fee structures, smart contract interactions, and regulatory status. Developer must not make false, deceptive, or exaggerated claims regarding potential returns, yields, rewards, security, or regulatory approval. Developer must prominently display its own end-user terms and privacy policy (if applicable) within the Mini App interface.

5.2 User Support and Complaints. Developer is solely responsible for providing prompt, professional, and effective support to Users of its Mini App. This includes responding to inquiries, resolving technical issues, handling complaints, addressing disputes, and providing clear channels for User communication. Developer must maintain adequate support resources and response times appropriate for the Mini App's complexity, user base, and transaction volume. Developer will promptly notify App Operator of any material complaints, patterns of user issues, or disputes that could impact the Mini App's operation or reputation.

5.3 Technical Compliance and Integration. Developer must integrate the Mini App using only approved Platform APIs, SDKs, and integration methods. Developer will adhere to all technical specifications, documentation, and integration guidelines provided by App Operator. Developer is responsible for ensuring the Mini App remains compatible with the Platform and the App, including promptly implementing any updates or modifications required by changes to the Platform, App, or underlying Blockchain networks.

5.4 Updates and Maintenance. Developer must keep the Mini App updated with necessary security patches, bug fixes, and compliance updates. Developer must notify App Operator in writing at least thirty (30) days in advance of any material changes to the Mini App's functionality, smart contracts, tokenomics, fee structure, or regulatory status. For emergency security patches or critical updates, Developer must notify App Operator immediately upon discovery and coordinate the deployment of such updates.

5.5 Prohibited Conduct and Content. Developer agrees not to, and will not permit any Authorized User or third party to:
  (a) Use the Platform or Services in any manner not expressly authorized by this Agreement;
  (b) Violate, misappropriate, or infringe the rights of App Operator, its licensors, or any third party, including intellectual property, privacy, or publicity rights;
  (c) Submit any User Content or Mini App content that is illegal, obscene, defamatory, threatening, harassing, hateful, or racially or ethnically offensive;
  (d) Engage in any fraudulent, deceptive, or misleading practices, including market manipulation, wash trading, or misrepresenting the nature of the Mini App;
  (e) Use the Platform or Services in a manner that could cause App Operator to violate any applicable law or regulation;
  (f) Attempt to circumvent any access controls, geo-blocking mechanisms, or other security measures implemented by App Operator;
  (g) Interfere with or disrupt the Platform, Services, App, or any other developer's integration or User's access;
  (h) Introduce any viruses, malware, or other harmful code into the Platform, App, or any User's device;
  (i) Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Platform or App;
  (j) Collect or attempt to collect User private keys, seed phrases, or wallet credentials through the Mini App; or
  (k) Engage in any business or activity that poses elevated financial, legal, or regulatory risk, including those identified in Section 6.4, without App Operator's prior written approval.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. REGULATORY RESPONSIBILITY ALLOCATION

6.1 Developer's Exclusive Responsibility. Developer is solely and exclusively responsible for ensuring that its Mini App, all activities conducted through it, and all User interactions comply with all applicable laws, regulations, rules, and governmental orders in every jurisdiction where the Mini App is accessed or made available. This includes, without limitation, securities laws, commodities laws, broker-dealer registration requirements, money transmission laws, payment services regulations, anti-money laundering (AML) and counter-terrorist financing (CTF) obligations, sanctions and export controls, consumer protection laws, gambling and gaming laws, data privacy and protection regulations, and any other applicable legal requirements. Developer bears all regulatory risk associated with its Mini App and will not hold App Operator responsible for any regulatory deficiencies, enforcement actions, fines, penalties, or other consequences.

6.2 Licensing and Approvals. Developer represents and warrants that it has obtained, and will maintain throughout the Term, all licenses, registrations, permits, memberships in self-regulatory organizations, and governmental approvals required to lawfully operate the Mini App in all relevant jurisdictions. Developer will promptly notify App Operator in writing of any license suspension, revocation, investigation, enforcement action, or material regulatory development affecting the Mini App. Developer will not make the Mini App available in any jurisdiction where it lacks required authorizations or where such availability would require App Operator to obtain any license or registration.

6.3 Sanctions and Export Controls. Developer represents and warrants that neither Developer, its Affiliates, principals, owners, directors, officers, employees, nor any User of the Mini App is: (a) a Sanctioned Person, meaning an individual or entity named on any sanctions list maintained by the United States (including OFAC), the European Union, the United Kingdom, the United Nations, or any other applicable governmental authority; or (b) located in, organized under the laws of, or owned or controlled by a person or entity located in a Sanctioned Territory (collectively, the countries and regions subject to comprehensive sanctions, which may change over time). Developer will implement appropriate sanctions screening mechanisms and will immediately notify App Operator of any sanctions-related issues.

6.4 Prohibited and Restricted Activities. Developer will not offer or facilitate through the Mini App any products, services, or activities that:
  (a) Involve the operation of a pyramid scheme, Ponzi scheme, or other fraudulent scheme;
  (b) Involve the sale or distribution of controlled substances, recreational drugs, or drug paraphernalia;
  (c) Involve the sale of firearms, ammunition, weapons, or related accessories;
  (d) Involve adult content, pornography, or sexually explicit material;
  (e) Constitute unlicensed money transmission, lending, or banking services;
  (f) Involve the offering of securities, commodities, or other regulated investment products without all required registrations;
  (g) Involve the creation or distribution of tokens or Digital Assets that are securities under applicable law without proper registration or exemption; or
  (h) Otherwise pose elevated financial, legal, or regulatory risk to App Operator, as determined in App Operator's sole discretion.

6.5 No Regulatory Reliance. Developer acknowledges and agrees that App Operator provides no regulatory advice, compliance services, licensing assistance, KYC/AML infrastructure, or regulatory coverage of any kind. Developer has independently evaluated all regulatory requirements applicable to its Mini App and makes no reliance on App Operator's Platform, App status, or operations for its own regulatory compliance. App Operator may, at its sole discretion, geo-block or restrict access to the Mini App in certain jurisdictions to manage regulatory risk, without any obligation to do so.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7. SECURITY REQUIREMENTS

7.1 Secure Development Lifecycle. Developer will implement and maintain a secure software development lifecycle appropriate for blockchain applications, including: (a) threat modeling and risk assessment; (b) secure coding standards; (c) rigorous input validation and sanitization; (d) regular automated and manual security testing; and (e) dependency scanning and management.

7.2 Smart Contract Audits. All smart contracts associated with the Mini App must undergo professional security audits by reputable third-party firms with blockchain security expertise before deployment on mainnet. Developer will provide audit reports to App Operator upon request. Developer will promptly remediate all critical and high-severity findings before deployment. Material updates to smart contracts require additional audits or re-audits.

7.3 Private Key Prohibition. The Mini App will never request, prompt for, collect, store, transmit, or process User private keys, seed phrases, mnemonics, or any other wallet credentials. All cryptographic signing operations must occur exclusively within the User's self-custody wallet. Developer will not implement any functionality that could reasonably be used to deceive Users into revealing their private keys.

7.4 Incident Response and Notification. Developer will maintain a written incident response plan that includes procedures for: (a) detecting and investigating security incidents; (b) containing and mitigating incidents; (c) notifying affected Users and App Operator; and (d) documenting and remediating root causes. Developer will notify App Operator within twenty-four (24) hours of any security incident, vulnerability exploitation, data breach, or unauthorized access affecting the Mini App or any User data. Developer will provide regular status updates and cooperate fully with App Operator in any mitigation, communication, or remediation efforts.

7.5 Vulnerability Disclosure. Developer will promptly disclose to App Operator any known or suspected vulnerabilities in the Mini App or its dependencies that have a CVSS score of 7.0 or higher (or equivalent criticality). Developer will implement patches or mitigations for critical vulnerabilities within seventy-two (72) hours and will provide evidence of remediation to App Operator upon request.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

8. DATA PROTECTION AND PRIVACY

8.1 Independent Controllers. App Operator and Developer are independent data controllers with respect to any personal data processed in connection with this Agreement. Each party determines the purposes and means of its own processing and is solely responsible for its own compliance with applicable data protection laws. Nothing in this Agreement creates a joint controller, data processor, or data sub-processor relationship between the parties.

8.2 Developer Privacy Obligations. If the Mini App collects, processes, or stores any personal data from Users, Developer must:
  (a) Publish and maintain a clear, comprehensive privacy policy that complies with all applicable laws and accurately describes Developer's data practices, including categories of data collected, purposes of processing, third-party sharing, and User rights;
  (b) Collect only the minimum personal data necessary for the Mini App's stated functionality and retain it only as long as necessary;
  (c) Implement appropriate technical and organizational measures to protect personal data from unauthorized access, loss, or disclosure;
  (d) Honor all User rights under applicable law, including rights of access, correction, deletion, and data portability;
  (e) Obtain all necessary consents for data processing where required by law; and
  (f) Comply with all cross-border data transfer restrictions and implement appropriate safeguards (such as Standard Contractual Clauses) for any international data transfers.

8.3 Prohibited Data Practices. Developer will not: (a) sell or rent User personal data to third parties; (b) use User personal data for behavioral advertising, profiling, or any purpose incompatible with the Mini App's stated functionality; (c) combine User personal data with data from other sources in a manner inconsistent with applicable law or Developer's privacy policy; or (d) collect sensitive personal data without obtaining explicit, informed consent where required.

8.4 Data Breach Notification. Developer will notify App Operator and affected Users without undue delay upon becoming aware of any data breach involving User personal data, in accordance with applicable law and the incident response requirements of Section 7.4.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

9. FEES, MONETIZATION, AND REVENUE

9.1 Developer-Controlled Fees. Developer may implement fees, commissions, spreads, protocol emissions, yield mechanisms, subscription charges, or other monetization directly through its smart contracts, designated payment processors, or other mechanisms. App Operator plays no role in setting, calculating, collecting, holding, transmitting, or distributing any such fees or revenue. All monetization flows occur directly between Users and Developer's protocols or processors, without App Operator's involvement, custody, or intermediation.

9.2 No Financial Intermediation. Developer acknowledges and agrees that App Operator does not match orders, operate payment rails, custody funds, facilitate transfers, or provide any financial infrastructure on Developer's behalf. App Operator has no visibility into, control over, or responsibility for any financial transactions or economic arrangements between Developer and Users.

9.3 Tax Obligations. Developer is solely responsible for determining its tax obligations and for collecting, reporting, and remitting all applicable taxes, duties, fees, and other governmental charges arising from its fees, revenue, emissions, or other monetization activities. Developer will indemnify App Operator against any tax claims, penalties, or interest attributable to the Mini App or Developer's monetization.

9.4 Revenue Share Programs. App Operator may offer optional revenue sharing or partnership programs through separate written agreements. In the absence of such a separate agreement, no revenue sharing applies, and Developer retains all revenue generated through its Mini App. Any revenue share arrangement does not create a partnership, joint venture, or agency relationship between the parties.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10. BRANDING, MARKETING, AND PUBLICITY

10.1 Trademark License to Developer. Subject to Developer's compliance with this Agreement, App Operator grants Developer a limited, revocable, non-exclusive, non-transferable, non-sublicensable license during the Term to use App Operator Marks solely as expressly authorized in the Platform documentation and brand guidelines for purposes of integrating the Mini App within the App and indicating compatibility.

10.2 Trademark License to App Operator. Developer grants App Operator a worldwide, non-exclusive, royalty-free, sublicensable license during the Term to use Developer's name, logo, and brand assets to identify Developer as a Mini App provider within the App, in marketing materials, press releases, and other promotional contexts. App Operator will use Developer's brand assets in accordance with any reasonable usage guidelines provided.

10.3 Brand Guidelines Compliance. Developer must use App Operator Marks exactly as provided, without modification, and must comply with all brand usage guidelines provided by App Operator. Developer will not alter, animate, or combine App Operator Marks with other marks, or use them in a disparaging or misleading context. Developer will include all required trademark designations (® or ™) as specified.

10.4 No Implied Endorsement. Developer will not make any representations or statements implying that App Operator endorses, approves, vets, guarantees, or assumes responsibility for the Mini App, its security, regulatory compliance, yields, performance, or any other aspect. All promotional materials must clearly and conspicuously identify Developer as the Mini App provider.

10.5 Publicity Restrictions. Developer will not issue any press release, case study, blog post, or public statement regarding this Agreement, the relationship with App Operator, or the integration without App Operator's prior written approval. App Operator may publicize the partnership and Mini App listing in its discretion, including through announcements, social media, and marketing channels.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

11. INTELLECTUAL PROPERTY

11.1 Ownership; Reservation of Rights. As between the parties, App Operator retains all right, title, and interest in and to the Platform, Portal, App, APIs, SDKs, documentation, and all other technology, content, and materials provided by App Operator (collectively, "App Operator Technology"). Developer retains all right, title, and interest in and to the Mini App, including its smart contracts, user interface, content, and related technology (collectively, "Developer Technology"). All rights not expressly granted are reserved by the respective owner. No implied licenses are created by this Agreement.

11.2 License to Developer. Subject to Developer's compliance with this Agreement, App Operator grants Developer a limited, non-exclusive, non-transferable, non-sublicensable, revocable license during the Term to: (a) access and use the Platform and Services for the sole purpose of developing, testing, and operating the approved Mini App; and (b) integrate the approved Mini App with the App using the provided APIs, SDKs, and integration tools, in accordance with the documentation.

11.3 License to App Operator. Developer grants App Operator a worldwide, perpetual, irrevocable, royalty-free, non-exclusive, transferable, and sublicensable license to: (a) host, store, display, perform, reproduce, and distribute the Mini App and its content via the App and Platform; (b) modify the Mini App solely to the extent necessary for technical compatibility with the App and Platform (such as formatting adjustments); (c) use Developer's name, logo, and brand assets as permitted in Section 10; and (d) promote and market the Mini App in connection with the App and App Operator's business. This license survives termination of this Agreement solely to the extent necessary for App Operator to fulfill its obligations and exercise its rights with respect to copies of the Mini App already integrated, displayed, or distributed prior to termination.

11.4 Feedback License. Developer may provide suggestions, enhancement requests, recommendations, or other feedback regarding the Platform or Services ("Feedback"). Developer grants App Operator a perpetual, irrevocable, worldwide, royalty-free, fully paid-up, transferable, and sublicensable license to use, modify, exploit, and incorporate any Feedback into the Platform, Services, or other App Operator products and services without any obligation or compensation to Developer. Developer waives any moral rights in such Feedback.

11.5 Open Source Compliance. Developer will comply with all applicable open source licenses for any third-party components, libraries, or code used in the Mini App. Developer will maintain accurate records of all open source components and their licenses. Developer will not use any open source code that is licensed under a copyleft or viral license (such as GPL, AGPL, or similar) in a manner that would: (a) require the disclosure, distribution, or licensing of any App Operator Technology; (b) impose any condition, restriction, or obligation on App Operator's right to use, license, or distribute its technology; or (c) cause App Operator Technology to become subject to any open source license terms.

11.6 No Reverse Engineering. Developer will not, and will not permit any Authorized User or third party to, reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code, underlying ideas, algorithms, or structure of the Platform or App, except to the extent expressly permitted by applicable law notwithstanding this restriction.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

12. CONFIDENTIALITY

12.1 Confidential Information. Each party (the "Disclosing Party") may disclose Confidential Information to the other party (the "Receiving Party") in connection with this Agreement. Confidential Information includes all non-public information, regardless of form, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and circumstances of disclosure. Confidential Information does not include information that: (a) is or becomes generally available to the public other than through a breach of this Agreement; (b) was rightfully known to the Receiving Party without restriction prior to disclosure; (c) is rightfully obtained by the Receiving Party from a third party without restriction; or (d) is independently developed by the Receiving Party without use of or reference to Confidential Information.

12.2 Confidentiality Obligations. The Receiving Party will: (a) protect the Disclosing Party's Confidential Information using the same degree of care it uses to protect its own confidential information of a similar nature, but in no event less than reasonable care; (b) use Confidential Information solely to perform its obligations and exercise its rights under this Agreement; and (c) limit access to Confidential Information to those employees, contractors, and advisors who need such access for purposes of this Agreement and who are bound by confidentiality obligations at least as protective as those contained herein.

12.3 Compelled Disclosure. If the Receiving Party is required by law, regulation, or legal process to disclose any Confidential Information, it will provide the Disclosing Party with prompt notice (to the extent legally permitted) to allow the Disclosing Party to seek a protective order or other appropriate remedy. If such protection is not obtained, the Receiving Party will disclose only the minimum information required to comply and will use reasonable efforts to obtain confidential treatment for any disclosed information.

12.4 Injunctive Relief. Each party acknowledges that a breach of confidentiality obligations may cause irreparable harm for which monetary damages would be an inadequate remedy. The Disclosing Party is entitled to seek injunctive relief without the necessity of posting bond or proving actual damages, in addition to any other remedies available at law or equity.

12.5 Survival. Confidentiality obligations survive termination of this Agreement and continue for a period of five (5) years from the date of disclosure, except that trade secrets and other Confidential Information entitled to perpetual protection under applicable law will be protected indefinitely.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

13. REPRESENTATIONS AND WARRANTIES

13.1 Mutual Representations. Each party represents and warrants that: (a) it has the full power, authority, and legal right to enter into and perform this Agreement; (b) this Agreement constitutes a valid and binding obligation enforceable against it in accordance with its terms; and (c) its execution and performance does not violate any other agreement or obligation to which it is bound.

13.2 Developer Representations and Warranties. Developer represents and warrants that:
  (a) Regulatory Compliance: The Mini App complies, and Developer's operation of it complies, with all applicable laws, regulations, and governmental orders in all jurisdictions where it is available. Developer holds, and will maintain, all required licenses, registrations, and approvals in good standing.
  (b) Sanctions Compliance: Neither Developer nor any of its Affiliates, principals, or Authorized Users is a Sanctioned Person or located in a Sanctioned Territory.
  (c) IP Ownership: Developer owns or has secured all rights necessary to grant the licenses in Section 11 and to operate the Mini App. The Mini App does not infringe, misappropriate, or violate any intellectual property, privacy, or other rights of any third party.
  (d) Security: The Mini App implements industry-standard security practices, contains no malware, viruses, or other harmful code, and does not compromise the security of the Platform, App, or User devices.
  (e) Accuracy of Information: All information provided to App Operator, including in any submission materials, is complete, accurate, and not misleading in any material respect.
  (f) No Fraud: The Mini App is not designed or operated to facilitate fraud, deception, market manipulation, or any other illegal or unethical activity.
  (g) No Prohibited Activities: The Mini App does not engage in any of the prohibited activities listed in Sections 5.5 and 6.4.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

14. DISCLAIMERS

14.1 AS-IS AND AS-AVAILABLE. EXCEPT AS EXPRESSLY PROVIDED IN SECTION 13, THE PLATFORM, SERVICES, AND ALL APP OPERATOR TECHNOLOGY ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. APP OPERATOR AND ITS AFFILIATES, LICENSORS, AND SERVICE PROVIDERS DISCLAIM ALL IMPLIED WARRANTIES, INCLUDING ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, QUIET ENJOYMENT, AND NON-INFRINGEMENT.

14.2 NO WARRANTY REGARDING MINI APPS. APP OPERATOR DOES NOT WARRANT, ENDORSE, GUARANTEE, OR ASSUME RESPONSIBILITY FOR ANY MINI APP, THIRD-PARTY CONTENT, OR ANY PRODUCT OR SERVICE ADVERTISED OR OFFERED BY A THIRD PARTY. APP OPERATOR WILL NOT BE A PARTY TO OR IN ANY WAY MONITOR ANY TRANSACTION BETWEEN DEVELOPER AND USERS.

14.3 NO WARRANTY OF PERFORMANCE. APP OPERATOR DOES NOT WARRANT THAT: (A) THE PLATFORM OR SERVICES WILL MEET DEVELOPER'S REQUIREMENTS OR EXPECTATIONS; (B) THE PLATFORM OR SERVICES WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; (C) ANY DEFECTS WILL BE CORRECTED; (D) THE PLATFORM OR SERVICES ARE FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS; (E) ANY INFORMATION OBTAINED THROUGH THE PLATFORM OR SERVICES WILL BE ACCURATE, COMPLETE, OR RELIABLE; OR (F) THE MINI APP WILL ACHIEVE ANY PARTICULAR LEVEL OF USER ENGAGEMENT, TRANSACTION VOLUME, OR MONETIZATION.

14.4 NO GUARANTEE OF LISTING. APP OPERATOR MAKES NO GUARANTEE THAT ANY MINI APP SUBMISSION WILL BE APPROVED, THAT AN APPROVED MINI APP WILL REMAIN LISTED, OR THAT A LISTED MINI APP WILL RECEIVE ANY PARTICULAR PLACEMENT, RANKING, OR VISIBILITY WITHIN THE APP. APP OPERATOR MAY DELIST OR RESTRICT ACCESS TO ANY MINI APP AT ANY TIME FOR ANY REASON WITHOUT LIABILITY.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

15. INDEMNIFICATION

15.1 Indemnification Obligation. Developer will defend, indemnify, and hold harmless the Indemnitees from and against any and all third-party claims, demands, actions, suits, proceedings, liabilities, damages, losses, judgments, settlements, costs, and expenses (including reasonable attorneys' fees and costs of investigation) arising out of or relating to:
  (a) The Mini App, including its development, operation, content, smart contracts, functionality, or any User interactions with it;
  (b) Developer's breach of any representation, warranty, covenant, or obligation in this Agreement;
  (c) Developer's violation of any applicable law, regulation, or governmental order, including securities laws, AML/CTF requirements, sanctions, consumer protection laws, and data privacy laws;
  (d) Any regulatory investigation, inquiry, enforcement action, fine, or penalty relating to the Mini App or Developer's activities;
  (e) Any claim that the Mini App or Developer's technology infringes, misappropriates, or violates any intellectual property, privacy, or other rights of any third party;
  (f) Any security incident, data breach, or unauthorized access involving the Mini App or User data;
  (g) Any action taken by an app store provider (Apple, Google, or others) against the App or Developer attributable to the Mini App;
  (h) Any violation of sanctions or export control laws by Developer or any User of the Mini App;
  (i) Developer's negligence, fraud, willful misconduct, or violation of these Portal Terms; and
  (j) Any dispute, claim, or controversy between Developer and any User, including losses Users may claim.

15.2 Indemnification Procedure. App Operator will provide Developer with prompt written notice of any claim subject to indemnification (provided that delay in notice does not relieve Developer of its indemnity obligations except to the extent Developer is materially prejudiced). Developer will assume control of the defense and settlement of the claim, at its own expense, using counsel reasonably acceptable to App Operator. App Operator may participate in the defense at its own expense. Developer will not settle any claim without App Operator's prior written consent if the settlement: (a) admits any liability or wrongdoing on the part of any Indemnitee; (b) imposes any obligation or restriction on any Indemnitee; or (c) does not include a full release of the Indemnitees. App Operator may, at its option, assume control of the defense of any claim at Developer's expense if Developer fails to assume or diligently conduct the defense.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

16. LIMITATION OF LIABILITY

16.1 EXCLUSION OF CONSEQUENTIAL DAMAGES. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL APP OPERATOR OR ANY INDEMNITEE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, REVENUE, GOODWILL, DATA, USE, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT, THE PLATFORM, SERVICES, OR MINI APP, WHETHER BASED ON CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, AND EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

16.2 LIABILITY CAP. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, APP OPERATOR'S TOTAL CUMULATIVE LIABILITY TO DEVELOPER ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT, THE PLATFORM, OR SERVICES SHALL NOT EXCEED ONE THOUSAND U.S. DOLLARS ($1,000).

16.3 CARVE-OUTS. THE LIMITATIONS IN SECTIONS 16.1 AND 16.2 DO NOT APPLY TO: (A) DEVELOPER'S INDEMNIFICATION OBLIGATIONS UNDER SECTION 15; (B) EITHER PARTY'S BREACH OF CONFIDENTIALITY OBLIGATIONS UNDER SECTION 12; (C) EITHER PARTY'S INTELLECTUAL PROPERTY INFRINGEMENT CLAIMS; (D) EITHER PARTY'S FRAUD, WILLFUL MISCONDUCT, OR GROSS NEGLIGENCE; OR (E) DEVELOPER'S PAYMENT OBLIGATIONS (IF ANY).

16.4 BASIS OF BARGAIN. DEVELOPER ACKNOWLEDGES THAT THE PLATFORM AND SERVICES ARE PROVIDED FOR MINIMAL CONSIDERATION AND THAT THE LIMITATIONS OF LIABILITY IN THIS SECTION REFLECT AN INFORMED, VOLUNTARY ALLOCATION OF RISK AND ARE AN ESSENTIAL BASIS OF THE BARGAIN BETWEEN THE PARTIES. THIS ALLOCATION IS REFLECTED IN THE PRICING AND OTHER TERMS OF THIS AGREEMENT.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

17. SUSPENSION, REMOVAL, AND TERMINATION

17.1 Immediate Suspension Rights. App Operator may immediately suspend Developer's access to the Portal, Services, or Developer account, or disable or remove the Mini App from the App, with or without prior notice, if App Operator reasonably believes that:
  (a) The Mini App or Developer's activities violate any law, regulation, or governmental order;
  (b) The Mini App poses a security threat to the App, Platform, Users, or any third party;
  (c) The Mini App contains malware, viruses, or other harmful code;
  (d) The Mini App is subject to an active exploit, hack, or security incident;
  (e) Continued availability could expose App Operator or any Indemnitee to legal or regulatory liability;
  (f) An app store provider (Apple, Google, or others) requires removal or threatens action against the App;
  (g) App Operator receives credible reports of User complaints, fraud, or misconduct;
  (h) Developer has breached this Agreement; or
  (i) Immediate action is necessary to protect the integrity, security, or reputation of the App or Platform.

17.2 Removal and Delisting. App Operator may remove, delist, or restrict access to the Mini App (including geo-blocking in specific jurisdictions) at any time, for any reason or no reason, including based on compliance concerns, performance metrics, User feedback, business strategy, or App Operator's sole discretion. App Operator has no obligation to provide explanation for removal or delisting.

17.3 Termination by App Operator. App Operator may terminate this Agreement and Developer's access to the Portal and Services:
  (a) Immediately, for Developer's material breach of this Agreement;
  (b) Immediately, if Developer becomes a Sanctioned Person or is located in a Sanctioned Territory;
  (c) Immediately, if Developer ceases operation, becomes insolvent, or files for bankruptcy; or
  (d) Upon thirty (30) days' written notice, for any reason or no reason, including for convenience.

17.4 Termination by Developer. Developer may terminate this Agreement by providing sixty (60) days' written notice to App Operator, ceasing all use of the Platform and Services, and removing its Mini App from the App.

17.5 Effect of Termination. Upon termination or expiration of this Agreement for any reason:
  (a) All rights and licenses granted to Developer immediately cease;
  (b) Developer must immediately cease all use of the Platform, Services, and App Operator Marks;
  (c) App Operator may remove, disable, and cease displaying the Mini App from the App;
  (d) Developer will promptly delete and permanently destroy any Confidential Information of App Operator in its possession;
  (e) Developer will retrieve and export any User data for which it is responsible, as App Operator will have no further obligation to maintain or provide access to such data; and
  (f) The following provisions survive termination: Sections 1 (Definitions), 3.2 (Non-Custodial Architecture), 6 (Regulatory Responsibility Allocation), 8 (Data Protection and Privacy), 11.3 (License to App Operator solely for continued display of pre-termination copies), 11.4 (Feedback License), 12 (Confidentiality), 13 (Representations and Warranties), 14 (Disclaimers), 15 (Indemnification), 16 (Limitation of Liability), 18.5 (Effect of Termination), 19 (Miscellaneous), and 20 (Contact Information).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

18. DISPUTE RESOLUTION; ARBITRATION; CLASS ACTION WAIVER

PLEASE READ THIS SECTION CAREFULLY — IT AFFECTS YOUR LEGAL RIGHTS AND GOVERNS HOW DISPUTES BETWEEN YOU AND APP OPERATOR WILL BE RESOLVED. FOR DEVELOPERS LOCATED IN THE UNITED STATES OR CANADA, THIS SECTION INCLUDES A MANDATORY ARBITRATION AGREEMENT AND CLASS ACTION WAIVER.

18.1 Governing Law. This Agreement and any dispute, claim, or controversy arising out of or relating to this Agreement or the Portal or Services (collectively, "Disputes") shall be governed by and construed in accordance with the laws of the Cayman Islands, without giving effect to its conflict of laws principles.

18.2 Informal Dispute Resolution. Before initiating any arbitration or court proceeding, Developer and App Operator agree to attempt to resolve any Dispute informally. To initiate informal resolution, Developer must send a written notice to App Operator at legal@moveindustries.xyz that includes: (a) Developer's name and contact information; (b) a detailed description of the Dispute; and (c) a description of the specific relief sought. App Operator will send any such notice to Developer at the email address associated with its account. If the Dispute is not resolved within sixty (60) days of receipt of the notice, either party may initiate arbitration as provided below.

18.3 Agreement to Arbitrate. Developer and App Operator agree that any Dispute shall be resolved exclusively through final and binding arbitration administered by the Cayman International Dispute Resolution Centre (CIDRC) under its Arbitration Rules (the "CIDRC Rules") in effect at the time the arbitration is commenced, as modified by this Agreement. The CIDRC Rules are available at www.cidrc.org.ky.

18.4 Arbitration Location and Procedure. The seat of arbitration shall be George Town, Grand Cayman, Cayman Islands. The arbitration shall be conducted by a single arbitrator appointed in accordance with the CIDRC Rules. The language of the arbitration shall be English. The arbitrator may conduct hearings remotely by telephone or video conference if requested by either party. The arbitrator shall apply Cayman Islands law and shall be bound by this Agreement. Judgment on the arbitration award may be entered in any court having jurisdiction.

18.5 Arbitration Fees. Payment of all filing, administration, and arbitrator fees will be governed by the CIDRC Rules. The arbitrator may, in their discretion, allocate arbitration costs between the parties in accordance with applicable law and the CIDRC Rules.

18.6 Class Action Waiver. DEVELOPER AND APP OPERATOR AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS, WHETHER IN ARBITRATION OR IN COURT, WILL BE CONDUCTED SOLELY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. THE ARBITRATOR MAY NOT CONSOLIDATE MORE THAN ONE PERSON'S CLAIMS AND MAY NOT OTHERWISE PRESIDE OVER ANY FORM OF A CLASS OR REPRESENTATIVE PROCEEDING. IF THIS CLASS ACTION WAIVER IS FOUND TO BE UNENFORCEABLE IN ANY RESPECT, THEN THE ENTIRETY OF THIS SECTION 18 SHALL BE NULL AND VOID WITH RESPECT TO THE APPLICABLE DISPUTE, AND SUCH DISPUTE SHALL BE RESOLVED IN A COURT OF COMPETENT JURISDICTION.

18.7 Equitable Relief. Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent actual or threatened infringement, misappropriation, or violation of its intellectual property or proprietary rights, or to address a breach of confidentiality obligations, without waiving the right to arbitrate other Disputes.

18.8 Severability. If any provision of this Section 18 (other than the class action waiver) is found to be unenforceable, that provision shall be severed and the remaining provisions shall remain in full force and effect.

18.9 Coordinated Dispute Resolution; Joinder. If any claim, dispute, or proceeding is initiated by a User that names both App Operator and Developer as respondents or defendants, or that otherwise arises out of substantially the same facts, transactions, or occurrences involving both the App and the Mini App (a "Coordinated Claim"), Developer agrees as follows:
  (a) Venue Alignment. Developer agrees that such Coordinated Claim shall be resolved in the same forum, jurisdiction, and dispute resolution framework that governs the User's agreement with App Operator under the then-current Movement SuperApp Terms of Service, including any applicable arbitration provision, governing law, venue selection, and class action waiver.
  (b) Consent to Participation. Developer irrevocably consents to participate in, and not oppose or seek to transfer, dismiss, stay, or compel separation of, any Coordinated Claim filed or initiated in the forum required by the applicable SuperApp Terms of Service.
  (c) Arbitration Joinder. Where the applicable SuperApp Terms of Service require arbitration, Developer agrees to participate in the same arbitral forum, seat, and governing law, and to cooperate in good faith to permit joinder, consolidation, or coordinated administration of proceedings to the extent permitted by the applicable arbitration rules.
  (d) No Inconsistent Position. Developer will not assert any position in a Coordinated Claim that is inconsistent with the enforceability of the dispute resolution, arbitration, or venue provisions contained in the SuperApp Terms of Service.
  (e) Reservation of Substantive Defenses. Nothing in this Section limits Developer's ability to assert substantive defenses on the merits of any claim; this Section governs only procedural alignment and forum coordination.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

19. MISCELLANEOUS

19.1 Entire Agreement. This Agreement, together with the Privacy Policy (if referenced) and any other documents expressly incorporated by reference, constitutes the entire agreement between Developer and App Operator regarding the subject matter hereof and supersedes all prior or contemporaneous agreements, understandings, negotiations, and representations, whether written or oral.

19.2 Amendments and Modifications. App Operator may revise this Agreement at any time by posting the revised terms on the Portal or providing Developer with notice. Any revisions will be effective as of the date posted, unless a later effective date is specified. Developer's continued use of the Portal or Services after the effective date of any revised terms constitutes acceptance of such revised terms. If Developer does not agree to the revised terms, Developer must cease using the Portal and Services and remove its Mini App from the App. No modification of this Agreement requested by Developer will be effective unless provided by a written agreement signed by both parties.

19.3 Notices. All notices required or permitted under this Agreement must be in writing. Notices to App Operator will be sent to legal@moveindustries.xyz. Notices to Developer will be sent to the email address associated with its Developer account. Notices are deemed effective upon delivery (if by email, upon sending). Either party may update its contact information by providing written notice.

19.4 Assignment. Developer may not assign or delegate any of its rights or obligations under this Agreement, whether by operation of law, merger, acquisition, change of control, or otherwise, without App Operator's prior written consent. Any purported assignment in violation of this section is void. App Operator may assign this Agreement freely, including to any Affiliate or in connection with a merger, acquisition, or sale of all or substantially all of its assets.

19.5 Waiver. No failure or delay by either party in exercising any right under this Agreement will constitute a waiver of that right. No waiver of any provision will be effective unless in writing and signed by the party against whom it is sought to be enforced. A waiver of any breach of any provision will not be deemed a waiver of any subsequent breach of the same or any other provision.

19.6 Severability. If any provision of this Agreement is held to be unenforceable or invalid, that provision will be enforced to the maximum extent possible, and the remaining provisions will remain in full force and effect.

19.7 Force Majeure. Neither party will be liable for any delay or failure to perform its obligations under this Agreement (except for payment obligations) if such delay or failure is caused by events beyond its reasonable control, including acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, network infrastructure failures, strikes, or shortages of transportation, facilities, fuel, energy, labor, or materials.

19.8 Export Controls. Developer agrees to comply with all applicable export and re-export control laws and regulations, including the Export Administration Regulations maintained by the U.S. Department of Commerce and sanctions programs administered by OFAC. Developer represents and warrants that it is not located in, organized under the laws of, or owned or controlled by a person or entity located in a Sanctioned Territory, and that it will not use the Platform or Services in violation of any export or sanctions laws.

19.9 Anti-Corruption. Developer agrees to comply with all applicable anti-corruption laws, including the U.S. Foreign Corrupt Practices Act and the UK Bribery Act. Developer has not received or been offered any illegal or improper bribe, kickback, or payment in connection with this Agreement.

19.10 Electronic Signatures and Records. This Agreement may be accepted electronically, and electronic records of this Agreement will be admissible in any proceeding to the same extent as paper records. Developer agrees that electronic signatures are legally binding and enforceable.

19.11 Interpretation. Section headings are for convenience only and will not affect the interpretation of this Agreement. The words "including" and "includes" mean "including without limitation." The word "or" is not exclusive. The terms "hereof," "herein," and similar terms refer to this Agreement as a whole, not to any particular section.

19.12 Further Assurances. Developer agrees to execute and deliver any additional documents and take any further actions reasonably requested by App Operator to effectuate the purposes of this Agreement.

19.13 No Third-Party Beneficiaries. Except for the Indemnitees as specified in Section 15, this Agreement does not create any third-party beneficiary rights in any person or entity.

19.14 Cumulative Remedies. All rights and remedies provided in this Agreement are cumulative and not exclusive, and the exercise of any right or remedy does not preclude the exercise of any other right or remedy available at law or equity.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

20. CONTACT INFORMATION

If you have any questions about this Agreement, please contact us at:

Email: legal@moveindustries.xyz

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BY CLICKING "I AGREE," ACCESSING THE DEVELOPER PORTAL, OR SUBMITTING A MINI APP FOR REVIEW, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THIS AGREEMENT.`

// Form state
const appForm = ref({
  name: '',
  description: '',
  icon: '',
  url: '',
  slug: '',
  developerName: '',
  category: 'games',
  customCategory: '',
  language: 'all',
  permissions: []
})

// Auto-generate slug from app name
watch(() => appForm.value.name, (newName) => {
  // Only auto-generate if slug is empty or matches the previous auto-generated value
  if (!appForm.value.slug || appForm.value.slug === generateSlug(appForm.value.name)) {
    appForm.value.slug = generateSlug(newName)
  }
})

// Generate URL-friendly slug
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

// Validate slug format
function isValidSlug(slug: string): boolean {
  // Must be lowercase letters, numbers, and hyphens only
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
}

// Validate icon URL: must start with https:// and end with .png or .jpg
function isValidIconUrl(url: string): boolean {
  return /^https:\/\/.+\.(png|jpg)$/i.test(url || '')
}

const categories = [
  { value: 'games', label: 'Games' },
  { value: 'earn', label: 'Earn' },
  { value: 'social', label: 'Social' },
  { value: 'collect', label: 'Collect' },
  { value: 'swap', label: 'Swap' },
  { value: 'utility', label: 'Utility' },
  { value: 'other', label: 'Other' },
]

const MAX_CUSTOM_CATEGORY_LENGTH = 24

// Get the actual category value to submit (custom text for "other")
function getSubmitCategory(): string {
  if (appForm.value.category === 'other') {
    return appForm.value.customCategory.trim() || 'other'
  }
  return appForm.value.category
}

// ISO 639-1 language codes with display names (sorted alphabetically after "All")
const languages = [
  { code: 'all', name: 'All Languages (Universal)' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'am', name: 'Amharic (አማርኛ)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'az', name: 'Azerbaijani (Azərbaycan)' },
  { code: 'be', name: 'Belarusian (Беларуская)' },
  { code: 'bg', name: 'Bulgarian (Български)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'bs', name: 'Bosnian (Bosanski)' },
  { code: 'ca', name: 'Catalan (Català)' },
  { code: 'cs', name: 'Czech (Čeština)' },
  { code: 'cy', name: 'Welsh (Cymraeg)' },
  { code: 'da', name: 'Danish (Dansk)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'el', name: 'Greek (Ελληνικά)' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'et', name: 'Estonian (Eesti)' },
  { code: 'eu', name: 'Basque (Euskara)' },
  { code: 'fa', name: 'Persian (فارسی)' },
  { code: 'fi', name: 'Finnish (Suomi)' },
  { code: 'fil', name: 'Filipino (Tagalog)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'ga', name: 'Irish (Gaeilge)' },
  { code: 'gl', name: 'Galician (Galego)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'he', name: 'Hebrew (עברית)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'hr', name: 'Croatian (Hrvatski)' },
  { code: 'hu', name: 'Hungarian (Magyar)' },
  { code: 'hy', name: 'Armenian' },
  { code: 'id', name: 'Indonesian (Bahasa Indonesia)' },
  { code: 'is', name: 'Icelandic (Íslenska)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ka', name: 'Georgian (ქართული)' },
  { code: 'kk', name: 'Kazakh (Қазақша)' },
  { code: 'km', name: 'Khmer (ភាសាខ្មែរ)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'ky', name: 'Kyrgyz (Кыргызча)' },
  { code: 'lo', name: 'Lao (ລາວ)' },
  { code: 'lt', name: 'Lithuanian (Lietuvių)' },
  { code: 'lv', name: 'Latvian (Latviešu)' },
  { code: 'mk', name: 'Macedonian (Македонски)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'mn', name: 'Mongolian (Монгол)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'ms', name: 'Malay (Bahasa Melayu)' },
  { code: 'my', name: 'Burmese (မြန်မာ)' },
  { code: 'ne', name: 'Nepali (नेपाली)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'no', name: 'Norwegian (Norsk)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'ps', name: 'Pashto (پښتو)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'ro', name: 'Romanian (Română)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'si', name: 'Sinhala (සිංහල)' },
  { code: 'sk', name: 'Slovak (Slovenčina)' },
  { code: 'sl', name: 'Slovenian (Slovenščina)' },
  { code: 'so', name: 'Somali (Soomaali)' },
  { code: 'sq', name: 'Albanian (Shqip)' },
  { code: 'sr', name: 'Serbian (Српски)' },
  { code: 'sv', name: 'Swedish (Svenska)' },
  { code: 'sw', name: 'Swahili (Kiswahili)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'th', name: 'Thai (ไทย)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'uk', name: 'Ukrainian (Українська)' },
  { code: 'ur', name: 'Urdu (اردو)' },
  { code: 'uz', name: 'Uzbek (Oʻzbek)' },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'zu', name: 'Zulu (isiZulu)' },
]

const availablePermissions = [
  'wallet.read',
  'wallet.sign',
  'storage.read',
  'storage.write',
  'camera',
  'location',
  'notify'
]

// Initialize Aptos client for Movement Network
const aptosClient = computed(() => {
  if (TEST_MODE.value) {
    // Movement Testnet (chain ID 250)
    return new Aptos(new AptosConfig({
      network: Network.CUSTOM,
      fullnode: 'https://testnet.movementnetwork.xyz/v1',
      chainId: 250
    }))
  } else {
    // Movement Mainnet (chain ID 126)
    return new Aptos(new AptosConfig({
      network: Network.CUSTOM,
      fullnode: 'https://mainnet.movementnetwork.xyz/v1',
      chainId: 126
    }))
  }
})

// Check available wallets
function checkWallets() {
  if (typeof window === 'undefined') return

  console.log('[AppPublisher] Checking wallets...')

  availableWallets.value = availableWallets.value.map(wallet => {
    let hasWallet = false

    // Check primary key
    const windowObj = (window as any)[wallet.windowKey]
    if (windowObj) {
      // If wallet has a chainKey (e.g., nightly.aptos), check if that chain API exists
      if (wallet.chainKey) {
        hasWallet = !!(windowObj[wallet.chainKey])
        console.log(`[AppPublisher] ${wallet.name}: window.${wallet.windowKey}.${wallet.chainKey} = ${hasWallet}`)
      } else {
        hasWallet = true
        console.log(`[AppPublisher] ${wallet.name}: window.${wallet.windowKey} = ${hasWallet}`)
      }
    } else {
      console.log(`[AppPublisher] ${wallet.name}: window.${wallet.windowKey} not found`)
    }

    // Check fallback key if primary not found
    if (!hasWallet && wallet.fallbackKey) {
      hasWallet = !!(window as any)[wallet.fallbackKey]
      console.log(`[AppPublisher] ${wallet.name}: fallback window.${wallet.fallbackKey} = ${hasWallet}`)
    }

    return {
      ...wallet,
      available: hasWallet
    }
  })

  console.log('[AppPublisher] Wallet check complete:', availableWallets.value.map(w => ({ name: w.name, available: w.available })))
}

// Check wallets with retry mechanism (wallet extensions inject asynchronously)
async function checkWalletsWithRetry() {
  // First immediate check
  checkWallets()

  // Retry up to 5 times with increasing delays
  const delays = [100, 200, 500, 1000, 2000]

  for (const delay of delays) {
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, delay))

    // Check again
    const previousState = availableWallets.value.map(w => w.available)
    checkWallets()
    const currentState = availableWallets.value.map(w => w.available)

    // If we found all wallets or state hasn't changed, stop retrying
    const allFound = currentState.every(available => available === true)
    const stateChanged = JSON.stringify(previousState) !== JSON.stringify(currentState)

    if (allFound || !stateChanged) {
      break
    }
  }
}

// Open wallet modal and check wallets
function openWalletModal() {
  showWalletModal.value = true
  // Check wallets again when modal opens to catch any late-loading extensions
  checkWalletsWithRetry()
}

// Connect Wallet
async function connectWallet(walletNameParam: string) {
  try {
    loading.value = true
    error.value = ''

    // Find wallet config by name
    const walletConfig = availableWallets.value.find(w => w.name === walletNameParam)
    if (!walletConfig) {
      throw new Error(`Wallet ${walletNameParam} not found`)
    }

    // Get wallet object - handle multi-chain wallets (e.g., nightly.aptos)
    let walletObj = (window as any)[walletConfig.windowKey]

    // If this is a multi-chain wallet, get the chain-specific API
    if (walletObj && walletConfig.chainKey) {
      walletObj = walletObj[walletConfig.chainKey]
    }

    // Try fallback key if primary not found
    if (!walletObj && walletConfig.fallbackKey) {
      walletObj = (window as any)[walletConfig.fallbackKey]
    }

    if (!walletObj) {
      throw new Error(`${walletNameParam} wallet is not installed`)
    }

    console.log('[AppPublisher] Wallet object found:', walletConfig.windowKey + (walletConfig.chainKey ? `.${walletConfig.chainKey}` : ''), walletObj)
    console.log('[AppPublisher] Available methods:', Object.keys(walletObj))

    // Different wallets have different APIs
    let accountInfo: any = null

    // Try Aptos Wallet Standard (most common)
    if (typeof walletObj.connect === 'function') {
      console.log('[AppPublisher] Calling connect()')
      const connectResult = await walletObj.connect()
      console.log('[AppPublisher] Connect result:', connectResult)

      // Some wallets return account info from connect, others don't
      if (connectResult && connectResult.address) {
        accountInfo = connectResult
      }
    }

    // If we don't have account info yet, try calling account()
    if (!accountInfo && typeof walletObj.account === 'function') {
      console.log('[AppPublisher] Calling account()')
      accountInfo = await walletObj.account()
      console.log('[AppPublisher] Account result:', accountInfo)
    }

    // Fallback: check if wallet has address property directly
    if (!accountInfo && walletObj.address) {
      accountInfo = { address: walletObj.address }
    }

    if (!accountInfo || !accountInfo.address) {
      throw new Error(`Could not get account from ${walletNameParam} wallet`)
    }

    walletAddress.value = accountInfo.address
    walletName.value = walletNameParam
    connected.value = true
    showWalletModal.value = false
    showMessage('success', 'Wallet connected successfully!')

    // Load developer's apps
    await loadDeveloperApps()
  } catch (err: any) {
    showMessage('error', err.message || 'Failed to connect wallet')
    console.error('Wallet connection error:', err)
  } finally {
    loading.value = false
  }
}

// Disconnect Wallet
async function disconnectWallet() {
  try {
    // Find wallet config by name
    const walletConfig = availableWallets.value.find(w => w.name === walletName.value)
    if (walletConfig) {
      // Get wallet object - handle multi-chain wallets
      let walletObj = (window as any)[walletConfig.windowKey]

      // If this is a multi-chain wallet, get the chain-specific API
      if (walletObj && walletConfig.chainKey) {
        walletObj = walletObj[walletConfig.chainKey]
      }

      // Try fallback key if primary not found
      if (!walletObj && walletConfig.fallbackKey) {
        walletObj = (window as any)[walletConfig.fallbackKey]
      }

      if (walletObj && walletObj.disconnect) {
        await walletObj.disconnect()
      }
    }

    connected.value = false
    walletAddress.value = ''
    walletName.value = ''
    developerApps.value = []
    showMessage('success', 'Wallet disconnected')
  } catch (err: any) {
    showMessage('error', err.message || 'Failed to disconnect wallet')
  }
}

// Load developer's apps
async function loadDeveloperApps() {
  try {
    loading.value = true
    error.value = ''

    const result = await aptosClient.value.view({
      payload: {
        function: `${REGISTRY_ADDRESS.value}::app_registry::get_developer_apps`,
        functionArguments: [walletAddress.value],
      },
    })

    developerAppIndices.value = result[0] || []
    developerApps.value = result[1] || []

    // Check for pending changes for each app
    for (let i = 0; i < developerAppIndices.value.length; i++) {
      const appIndex = developerAppIndices.value[i]
      try {
        const hasPending = await aptosClient.value.view({
          payload: {
            function: `${REGISTRY_ADDRESS.value}::app_registry::has_pending_change`,
            functionArguments: [appIndex],
          },
        })
        hasPendingChange.value[appIndex] = hasPending[0] || false
      } catch {
        hasPendingChange.value[appIndex] = false
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load your apps'
    console.error('Load developer apps error:', err)
  } finally {
    loading.value = false
  }
}

// Load all active apps
async function loadAllActiveApps() {
  try {
    loading.value = true
    error.value = ''

    const apps = await aptosClient.value.view({
      payload: {
        function: `${REGISTRY_ADDRESS.value}::app_registry::get_all_active_apps`,
        functionArguments: [],
      },
    })

    console.log('Raw active apps response:', apps)
    console.log('Active apps array:', apps[0])

    allActiveApps.value = apps[0] || []
  } catch (err: any) {
    error.value = err.message || 'Failed to load active apps'
    console.error('Load active apps error:', err)
  } finally {
    loading.value = false
  }
}

// Edit app - populate form with existing app data
function editApp(appIndex: number, app: any) {
  editingAppIndex.value = appIndex
  const appCategory = app.category || 'games'
  const isKnownCategory = categories.some(c => c.value === appCategory)
  appForm.value = {
    name: app.name || '',
    description: app.description || '',
    icon: app.icon || '',
    url: app.url || '',
    slug: app.slug || '', // Slug cannot be changed
    developerName: app.developer_name || '',
    category: isKnownCategory ? appCategory : 'other',
    customCategory: isKnownCategory ? '' : appCategory,
    language: app.language || 'all',
    permissions: app.permissions || []
  }
  activeTab.value = 'submit'
  showMessage('success', 'App data loaded. Make your changes and submit to request an update.')
}

// Cancel editing
function cancelEdit() {
  editingAppIndex.value = null
  termsAgreed.value = false
  appForm.value = {
    name: '',
    description: '',
    icon: '',
    url: '',
    slug: '',
    developerName: '',
    category: 'games',
    customCategory: '',
    language: 'all',
    permissions: []
  }
}

// Submit app or request update
async function submitApp() {
  try {
    loading.value = true
    error.value = ''
    success.value = ''

    // Find wallet config by name
    const walletConfig = availableWallets.value.find(w => w.name === walletName.value)
    if (!walletConfig) {
      throw new Error('Wallet not found')
    }

    // Get wallet object - handle multi-chain wallets
    let walletObj = (window as any)[walletConfig.windowKey]

    // If this is a multi-chain wallet, get the chain-specific API
    if (walletObj && walletConfig.chainKey) {
      walletObj = walletObj[walletConfig.chainKey]
    }

    // Try fallback key if primary not found
    if (!walletObj && walletConfig.fallbackKey) {
      walletObj = (window as any)[walletConfig.fallbackKey]
    }

    if (!walletObj) {
      throw new Error('Wallet not available')
    }

    // Validate icon URL
    if (!isValidIconUrl(appForm.value.icon)) {
      throw new Error('Invalid icon URL. It must start with "https://" and end with ".png" or ".jpg".')
    }

    // If editing, use request_update instead of submit_app
    if (editingAppIndex.value !== null) {
      return await requestUpdateApp(editingAppIndex.value)
    }

    // Validate slug format (only for new submissions)
    if (!isValidSlug(appForm.value.slug)) {
      throw new Error('Invalid slug format. Use only lowercase letters, numbers, and hyphens.')
    }

    // Check slug uniqueness by fetching all app indices and checking each app
    try {
      const allIdsResult = await aptosClient.value.view({
        payload: {
          function: `${REGISTRY_ADDRESS.value}::app_registry::get_all_app_indices`,
          functionArguments: [],
        },
      })

      const allAppIds = allIdsResult[0] as number[] || []

      // Check each app's slug
      for (const appId of allAppIds) {
        try {
          const appResult = await aptosClient.value.view({
            payload: {
              function: `${REGISTRY_ADDRESS.value}::app_registry::get_app`,
              functionArguments: [appId],
            },
          })

          const existingApp = appResult[0] as any
          if (existingApp && existingApp.slug === appForm.value.slug) {
            throw new Error(`The slug "${appForm.value.slug}" is already taken. Please choose a different one.`)
          }
        } catch (err: any) {
          // Ignore errors fetching individual apps, continue checking
          if (err.message.includes('already taken')) {
            throw err // Re-throw if it's our uniqueness error
          }
        }
      }
    } catch (err: any) {
      if (err.message.includes('already taken')) {
        throw err // Re-throw uniqueness errors
      }
      // If there's an error fetching apps, log it but don't block submission
      console.warn('Could not verify slug uniqueness:', err)
    }

    // Get submission fee
    const feeResult = await aptosClient.value.view({
      payload: {
        function: `${REGISTRY_ADDRESS.value}::app_registry::get_submit_fee`,
        functionArguments: [],
      },
    })
    const submissionFee = Number(feeResult[0])
    console.log('Submission fee:', submissionFee, 'octas')

    let transaction
    try {
      transaction = await aptosClient.value.transaction.build.simple({
        sender: walletAddress.value,
        data: {
          function: `${REGISTRY_ADDRESS.value}::app_registry::submit_app`,
          functionArguments: [
            appForm.value.name,
            appForm.value.description,
            appForm.value.icon,
            appForm.value.url,
            appForm.value.slug,
            appForm.value.developerName,
            getSubmitCategory(),
            appForm.value.language,
            appForm.value.permissions
          ],
        },
      })
    } catch (buildErr: any) {
      throw new Error(`Failed to build transaction: ${buildErr?.message || buildErr || 'Unknown error'}`)
    }

    let response
    try {
      response = await walletObj.signAndSubmitTransaction(transaction)
      if (!response || !response.hash) {
        throw new Error('Transaction was not submitted. No hash returned from wallet.')
      }
    } catch (submitErr: any) {
      // Check if user rejected
      if (submitErr?.message?.includes('reject') || submitErr?.code === 4001) {
        throw new Error('Transaction was cancelled by user')
      }
      throw new Error(`Transaction submission failed: ${submitErr?.message || submitErr || 'Unknown error'}`)
    }

    try {
      await aptosClient.value.waitForTransaction({ transactionHash: response.hash })
    } catch (waitErr: any) {
      // Transaction might have been submitted but failed on-chain
      throw new Error(`Transaction failed on-chain: ${waitErr?.message || waitErr || 'Unknown error'}`)
    }

    showMessage('success', 'App submitted successfully! It will be reviewed by the team.')

    // Reset form
    cancelEdit()

    // Reload developer apps
    await loadDeveloperApps()
  } catch (err: any) {
    // Safely extract error message
    let errorMessage = 'Failed to submit app'
    
    try {
      // Handle different error formats
      if (typeof err === 'string') {
        errorMessage = err
      } else if (err?.message) {
        errorMessage = err.message
      } else if (err?.error?.message) {
        errorMessage = err.error.message
      } else if (err?.error && typeof err.error === 'string') {
        errorMessage = err.error
      } else if (err?.toString) {
        errorMessage = err.toString()
      }
      
      // Try to parse if it's a JSON string
      if (errorMessage.startsWith('{') || errorMessage.startsWith('[')) {
        try {
          const parsed = JSON.parse(errorMessage)
          errorMessage = parsed.message || parsed.error || errorMessage
        } catch {
          // Not valid JSON, use as-is
        }
      }
    } catch (parseErr) {
      // If error extraction fails, use default message
      console.error('Error parsing error message:', parseErr)
    }

    // Check for specific contract errors
    if (errorMessage.includes('E_APP_ALREADY_EXISTS')) {
      errorMessage = 'You already have an app in the registry. Each wallet can only have ONE app. To change your app details (URL, name, etc.), you need to use "Update App" instead of submitting a new one. Check the "My Apps" tab to see your current app.'
    } else if (errorMessage.includes('E_RATE_LIMIT_EXCEEDED')) {
      errorMessage = 'Rate limit exceeded. You can only submit 2 apps per 24 hours.'
    } else if (errorMessage.includes('E_INVALID_STATUS')) {
      errorMessage = 'Your app has an invalid status for this operation.'
    } else if (errorMessage.includes('not valid JSON') || errorMessage.includes('Unexpected token')) {
      errorMessage = 'Transaction failed. Please check your network connection and try again. If the problem persists, the transaction may have been rejected by the network.'
    }

    showMessage('error', errorMessage)
    console.error('Submit app error:', err)
  } finally {
    loading.value = false
  }
}

// Request update for existing app
async function requestUpdateApp(appIndex: number) {
  try {
    loading.value = true
    error.value = ''
    success.value = ''

    // Find wallet config by name
    const walletConfig = availableWallets.value.find(w => w.name === walletName.value)
    if (!walletConfig) {
      throw new Error('Wallet not found')
    }

    // Get wallet object - handle multi-chain wallets
    let walletObj = (window as any)[walletConfig.windowKey]

    // If this is a multi-chain wallet, get the chain-specific API
    if (walletObj && walletConfig.chainKey) {
      walletObj = walletObj[walletConfig.chainKey]
    }

    // Try fallback key if primary not found
    if (!walletObj && walletConfig.fallbackKey) {
      walletObj = (window as any)[walletConfig.fallbackKey]
    }

    if (!walletObj) {
      throw new Error('Wallet not available')
    }

    // Validate icon URL
    if (!isValidIconUrl(appForm.value.icon)) {
      throw new Error('Invalid icon URL. It must start with "https://" and end with ".png" or ".jpg".')
    }

    let transaction
    try {
      transaction = await aptosClient.value.transaction.build.simple({
        sender: walletAddress.value,
        data: {
          function: `${REGISTRY_ADDRESS.value}::app_registry::request_update`,
          functionArguments: [
            appIndex,
            appForm.value.name,
            appForm.value.description,
            appForm.value.icon,
            appForm.value.url,
            getSubmitCategory(),
            appForm.value.language,
            appForm.value.permissions
          ],
        },
      })
    } catch (buildErr: any) {
      throw new Error(`Failed to build transaction: ${buildErr?.message || buildErr || 'Unknown error'}`)
    }

    let response
    try {
      response = await walletObj.signAndSubmitTransaction(transaction)
      if (!response || !response.hash) {
        throw new Error('Transaction was not submitted. No hash returned from wallet.')
      }
    } catch (submitErr: any) {
      // Check if user rejected
      if (submitErr?.message?.includes('reject') || submitErr?.code === 4001) {
        throw new Error('Transaction was cancelled by user')
      }
      throw new Error(`Transaction submission failed: ${submitErr?.message || submitErr || 'Unknown error'}`)
    }

    try {
      await aptosClient.value.waitForTransaction({ transactionHash: response.hash })
    } catch (waitErr: any) {
      // Transaction might have been submitted but failed on-chain
      throw new Error(`Transaction failed on-chain: ${waitErr?.message || waitErr || 'Unknown error'}`)
    }

    showMessage('success', 'Update requested successfully! Your app status has been changed to PENDING and will be reviewed by the team.')

    // Reset form
    cancelEdit()

    // Reload developer apps
    await loadDeveloperApps()
  } catch (err: any) {
    // Safely extract error message
    let errorMessage = 'Failed to request update'
    
    try {
      // Handle different error formats
      if (typeof err === 'string') {
        errorMessage = err
      } else if (err?.message) {
        errorMessage = err.message
      } else if (err?.error?.message) {
        errorMessage = err.error.message
      } else if (err?.error && typeof err.error === 'string') {
        errorMessage = err.error
      } else if (err?.toString) {
        errorMessage = err.toString()
      }
      
      // Try to parse if it's a JSON string
      if (errorMessage.startsWith('{') || errorMessage.startsWith('[')) {
        try {
          const parsed = JSON.parse(errorMessage)
          errorMessage = parsed.message || parsed.error || errorMessage
        } catch {
          // Not valid JSON, use as-is
        }
      }
    } catch (parseErr) {
      // If error extraction fails, use default message
      console.error('Error parsing error message:', parseErr)
    }

    // Check for specific contract errors
    if (errorMessage.includes('E_PENDING_CHANGES')) {
      errorMessage = 'You already have a pending update for this app. Please wait for admin approval before requesting another update.'
    } else if (errorMessage.includes('E_NOT_APP_OWNER')) {
      errorMessage = 'You are not the owner of this app.'
    } else if (errorMessage.includes('E_APP_NOT_FOUND')) {
      errorMessage = 'App not found.'
    }

    showMessage('error', errorMessage)
    console.error('Request update error:', err)
  } finally {
    loading.value = false
  }
}

// Get status text
function getStatusText(status: number) {
  const statusMap: Record<number, string> = {
    0: 'Pending',
    1: 'Approved',
    2: 'Rejected'
  }
  return statusMap[status] || 'Unknown'
}

// Format date
function formatDate(timestamp: string | number) {
  if (!timestamp || timestamp === '0') return 'N/A'
  return new Date(Number(timestamp) * 1000).toLocaleDateString()
}

function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement
  if (target && target.parentElement) {
    // Replace the broken image with a fallback emoji
    target.style.display = 'none'
    const fallback = document.createElement('span')
    fallback.textContent = '📱'
    target.parentElement.appendChild(fallback)
  }
}

// On mount
// Load submission fee
async function loadSubmissionFee() {
  try {
    const feeResult = await aptosClient.value.view({
      payload: {
        function: `${REGISTRY_ADDRESS.value}::app_registry::get_submit_fee`,
        functionArguments: [],
      },
    })
    submissionFeeOctas.value = Number(feeResult[0])
  } catch (err: any) {
    console.error('Error loading submission fee:', err)
    // Default to 1 MOVE if we can't fetch
    submissionFeeOctas.value = 100000000
  }
}

onMounted(() => {
  checkWalletsWithRetry()
  loadSubmissionFee()

  // Listen for wallet injection events
  if (typeof window !== 'undefined') {
    // Nightly wallet ready event
    window.addEventListener('nightly#initialized', () => {
      console.log('[AppPublisher] Nightly wallet initialized event')
      checkWallets()
    })

    // Razor wallet ready event
    window.addEventListener('razor#initialized', () => {
      console.log('[AppPublisher] Razor wallet initialized event')
      checkWallets()
    })

    // Generic window load event as backup
    window.addEventListener('load', () => {
      console.log('[AppPublisher] Window load event')
      setTimeout(() => checkWallets(), 100)
    })

    // Document ready state change
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('[AppPublisher] DOMContentLoaded event')
        setTimeout(() => checkWallets(), 100)
      })
    }
  }
})
</script>

<template>
<div class="publisher-container">
  <!-- Hero Header -->
  <div class="hero-header">
    <div class="hero-content">
      <h1 class="hero-title">App Publisher Dashboard</h1>
      <p class="hero-subtitle">Submit and manage your mini apps for the Movement ecosystem</p>
    </div>
  </div>

  <!-- Wallet Connection Card -->
  <div class="wallet-card">
    <div class="wallet-card-content">
      <div class="wallet-info">
        <div class="wallet-icon-wrapper">
          <span class="wallet-icon-emoji">{{ connected ? '✓' : '👋' }}</span>
        </div>
        <div class="wallet-details">
          <h3 class="wallet-title">{{ connected ? 'Wallet Connected' : 'Connect Your Wallet' }}</h3>
          <p class="wallet-description" v-if="!connected">
            Connect your wallet to get started
          </p>
          <div v-else class="wallet-address-display">
            <span class="wallet-badge">{{ walletName }}</span>
            <code class="wallet-address-mono">{{ walletAddress.slice(0, 6) }}...{{ walletAddress.slice(-4) }}</code>
          </div>
        </div>
      </div>
      <button v-if="!connected" @click="openWalletModal" :disabled="loading" class="btn-primary">
        <span v-if="!loading">Connect Wallet</span>
        <span v-else>Connecting...</span>
      </button>
      <button v-else @click="disconnectWallet" class="btn-secondary">
        Disconnect
      </button>
    </div>
  </div>

  <!-- Wallet Selection Modal -->
  <div v-if="showWalletModal" class="modal-overlay" @click="showWalletModal = false">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Connect Wallet</h3>
        <button @click="showWalletModal = false" class="close-btn">×</button>
      </div>
      <div class="wallet-list">
        <button
          v-for="wallet in filteredWallets"
          :key="wallet.name"
          @click="connectWallet(wallet.name)"
          :disabled="!wallet.available"
          class="wallet-option"
          :class="{ 'wallet-disabled': !wallet.available }"
        >
          <img :src="wallet.icon" :alt="wallet.name" class="wallet-icon-img" />
          <div class="wallet-info-text">
            <div class="wallet-name">{{ wallet.name }}</div>
            <div class="wallet-status">{{ wallet.available ? 'Ready to connect' : 'Not installed' }}</div>
          </div>
          <div v-if="wallet.available" class="status-dot"></div>
        </button>
      </div>
      <p class="modal-footer-text">By connecting, you agree to our Terms of Service</p>
    </div>
  </div>

  <div v-if="error" class="alert alert-error">
    <span>{{ error }}</span>
    <button @click="error = ''" class="alert-close">×</button>
  </div>
  <div v-if="success" class="alert alert-success">
    <span>{{ success }}</span>
    <button @click="success = ''" class="alert-close">×</button>
  </div>

  <div v-if="connected">
    <div class="tabs">
      <div class="tab" :class="{ active: activeTab === 'submit' }" @click="activeTab = 'submit'">
        Submit App
      </div>
      <div class="tab" :class="{ active: activeTab === 'my-apps' }" @click="activeTab = 'my-apps'; loadDeveloperApps()">
        My Apps ({{ developerApps.length }})
      </div>
      <div class="tab" :class="{ active: activeTab === 'browse' }" @click="activeTab = 'browse'; loadAllActiveApps()">
        Browse Apps
      </div>
    </div>

    <div v-if="activeTab === 'submit'">
      <div class="content-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h3 class="card-title" style="margin: 0;">{{ editingAppIndex !== null ? 'Edit App' : 'Submit New App' }}</h3>
          <button v-if="editingAppIndex !== null" @click="cancelEdit" class="btn-secondary" style="font-size: 0.875rem; padding: 0.5rem 1rem;">
            Cancel Edit
          </button>
        </div>
        <p class="card-subtitle">{{ editingAppIndex !== null ? 'Update your app details below. Your app will be set to PENDING status and require admin approval.' : 'Fill in the details below to submit your app for review' }}</p>
        <div v-if="editingAppIndex !== null" class="fee-notice" style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(255, 152, 0, 0.08) 100%); border-color: rgba(251, 191, 36, 0.3); margin-bottom: 1.5rem;">
          <div class="fee-notice-icon">⚠️</div>
          <div>
            <strong>Update Request</strong>
            <p>When you submit this update, your app status will change to PENDING and require admin approval before it goes live again.</p>
          </div>
        </div>
      <form @submit.prevent="submitApp">
        <div class="form-group">
          <label>App Name *</label>
          <input v-model="appForm.name" type="text" placeholder="My Awesome App" required />
          <small>Maximum 50 characters</small>
        </div>

        <div class="form-group">
          <label>Description *</label>
          <textarea v-model="appForm.description" placeholder="A brief description of your app..." required></textarea>
          <small>Maximum 200 characters</small>
        </div>

        <div class="form-group">
          <label>Icon URL *</label>
          <div style="position: relative;">
            <input
              v-model="appForm.icon"
              type="text"
              placeholder="https://yourdomain.com/icon.png"
              required
              :style="{ paddingRight: '40px' }"
            />
            <span
              v-if="appForm.icon"
              style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 18px;"
            >
              {{ isValidIconUrl(appForm.icon) ? '✅' : '❌' }}
            </span>
          </div>
          <small>Must be an HTTPS URL ending in .png or .jpg (e.g., https://yourdomain.com/icon.png)</small>
        </div>

        <div class="form-group">
          <label>App URL *</label>
          <input v-model="appForm.url" type="url" placeholder="https://myapp.com" required />
          <small>Must be HTTPS</small>
        </div>

        <div class="form-group" v-if="editingAppIndex === null">
          <label>App Slug *</label>
          <div style="position: relative;">
            <input
              v-model="appForm.slug"
              type="text"
              placeholder="my-awesome-app"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              :style="{ paddingRight: '40px' }"
            />
            <span
              v-if="appForm.slug"
              style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 18px;"
            >
              {{ isValidSlug(appForm.slug) ? '✅' : '❌' }}
            </span>
          </div>
          <small>URL-friendly identifier (lowercase, numbers, hyphens only). Example: bridge-assets, swap-tokens</small>
        </div>
        <div v-else class="form-group">
          <label>App Slug</label>
          <input
            v-model="appForm.slug"
            type="text"
            disabled
            :style="{ opacity: 0.6, cursor: 'not-allowed' }"
          />
          <small>Slug cannot be changed after submission</small>
        </div>

        <div class="form-group">
          <label>Developer Name</label>
          <input v-model="appForm.developerName" type="text" placeholder="Your name or organization" />
        </div>

        <div class="form-group">
          <label>Category *</label>
          <select v-model="appForm.category" required>
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
          </select>
        </div>

        <div class="form-group" v-if="appForm.category === 'other'">
          <label>Custom Category *</label>
          <input
            v-model="appForm.customCategory"
            type="text"
            placeholder="Enter your category (e.g., education, health)"
            :maxlength="MAX_CUSTOM_CATEGORY_LENGTH"
            required
          />
          <small>{{ appForm.customCategory.length }}/{{ MAX_CUSTOM_CATEGORY_LENGTH }} characters</small>
        </div>

        <div class="form-group">
          <label>Language *</label>
          <select v-model="appForm.language" required>
            <option v-for="lang in languages" :key="lang.code" :value="lang.code">{{ lang.name }}</option>
          </select>
          <small>Select the primary language your app is designed for, or "All Languages" if it works universally</small>
        </div>

        <div class="form-group">
          <label>Permissions</label>
          <div class="permissions-grid">
            <div v-for="perm in availablePermissions" :key="perm" class="permission-checkbox">
              <input type="checkbox" :id="perm" :value="perm" v-model="appForm.permissions" />
              <label :for="perm" style="margin: 0;">{{ perm }}</label>
            </div>
          </div>
          <small>Select only the permissions your app needs</small>
        </div>

        <div v-if="editingAppIndex === null" class="fee-notice">
          <div class="fee-notice-icon">💰</div>
          <div>
            <strong>Submission Fee: {{ submissionFeeMOVE }} MOVE</strong>
            <p>A one-time fee of {{ submissionFeeMOVE }} MOVE is required to submit your app for review. This helps prevent spam and maintain quality.</p>
          </div>
        </div>

        <!-- Developer Agreement Terms -->
        <div class="terms-section">
          <div class="terms-header">
            <div class="terms-icon">📜</div>
            <div>
              <strong>Developer Agreement</strong>
              <p>Please read and agree to the Mini App Developer Agreement before submitting</p>
            </div>
          </div>

          <div class="terms-container">
            <div class="terms-title-bar">
              <span class="terms-title">Movement Mini App Developer Agreement</span>
              <button type="button" @click="showTermsModal = true" class="terms-expand-btn">
                Expand ↗
              </button>
            </div>
            <textarea
              class="terms-textarea"
              :value="DEVELOPER_AGREEMENT_TEXT"
              readonly
            ></textarea>
          </div>

          <label class="terms-checkbox-label">
            <input
              type="checkbox"
              v-model="termsAgreed"
              class="terms-checkbox"
            />
            <span class="terms-checkbox-text">
              I have read, understood, and agree to be bound by the <strong>Mini App Developer Agreement</strong>
            </span>
          </label>
        </div>

        <!-- Terms Modal -->
        <div v-if="showTermsModal" class="modal-overlay" @click="showTermsModal = false">
          <div class="terms-modal-content" @click.stop>
            <div class="modal-header">
              <h3>Mini App Developer Agreement</h3>
              <button @click="showTermsModal = false" class="close-btn">×</button>
            </div>
            <div class="terms-modal-body">
              <pre class="terms-full-text">{{ DEVELOPER_AGREEMENT_TEXT }}</pre>
            </div>
            <div class="terms-modal-footer">
              <button @click="showTermsModal = false" class="btn-secondary">Close</button>
              <button @click="termsAgreed = true; showTermsModal = false" class="btn-primary">
                I Agree
              </button>
            </div>
          </div>
        </div>

        <button type="submit" :disabled="loading || !termsAgreed" class="btn-submit">
          <span v-if="!loading">{{ editingAppIndex !== null ? 'Request Update →' : 'Submit App for Review →' }}</span>
          <span v-else>{{ editingAppIndex !== null ? 'Requesting Update...' : 'Submitting...' }}</span>
        </button>
      </form>
      </div>
    </div>

    <div v-if="activeTab === 'my-apps'">
      <h3>Your Apps</h3>
      <div v-if="loading" style="text-align: center; padding: 2rem;">Loading...</div>
      <div v-else-if="developerApps.length === 0" class="empty-state">
        <div class="empty-state-icon">📦</div>
        <p>You haven't submitted any apps yet</p>
      </div>
      <div v-else class="apps-grid">
        <div v-for="(app, index) in developerApps" :key="developerAppIndices[index]" class="app-card">
          <div class="app-header">
            <div class="app-icon">
              <img 
                v-if="app.icon && (app.icon.startsWith('http://') || app.icon.startsWith('https://') || app.icon.startsWith('/'))" 
                :src="app.icon" 
                :alt="`${app.name} icon`"
                class="app-icon-image"
                @error="handleImageError"
              />
              <span v-else>{{ app.icon || '📱' }}</span>
            </div>
            <div>
              <div class="app-title">{{ app.name }}</div>
              <span class="app-category">{{ app.category }}</span>
            </div>
          </div>
          <p class="app-description">{{ app.description }}</p>
          <div class="app-meta">
            <span :class="'status-badge status-' + getStatusText(app.status).toLowerCase()">
              {{ getStatusText(app.status) }}
            </span>
            <span v-if="hasPendingChange[developerAppIndices[index]]" class="status-badge" style="background: rgba(251, 191, 36, 0.1); color: #d97706;">
              Update Pending
            </span>
            <span>Submitted: {{ formatDate(app.submitted_at) }}</span>
          </div>
          <div style="display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap;">
            <button @click="editApp(developerAppIndices[index], app)" class="btn" style="flex: 1; min-width: 120px; font-size: 0.875rem; padding: 0.5rem 1rem;">
              Edit App
            </button>
            <a :href="`https://mini-app-sharing.vercel.app/app/${app.slug}`" target="_blank" class="btn" style="flex: 1; min-width: 120px; display: inline-block; text-decoration: none; font-size: 0.875rem; padding: 0.5rem 1rem; text-align: center;">
              Launch App →
            </a>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'browse'">
      <h3>Active Apps</h3>
      <div v-if="loading" style="text-align: center; padding: 2rem;">Loading...</div>
      <div v-else-if="allActiveApps.length === 0" class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>No active apps found</p>
      </div>
      <div v-else class="apps-grid">
        <div v-for="app in allActiveApps" :key="app.developer_address" class="app-card">
          <div class="app-header">
            <div class="app-icon">
              <img 
                v-if="app.icon && (app.icon.startsWith('http://') || app.icon.startsWith('https://') || app.icon.startsWith('/'))" 
                :src="app.icon" 
                :alt="`${app.name} icon`"
                class="app-icon-image"
                @error="handleImageError"
              />
              <span v-else>{{ app.icon || '📱' }}</span>
            </div>
            <div>
              <div class="app-title">{{ app.name }}</div>
              <span class="app-category">{{ app.category }}</span>
            </div>
          </div>
          <p class="app-description">{{ app.description }}</p>
          <div class="app-meta">
            <span>⭐ {{ (app.rating / 10).toFixed(1) }}</span>
            <span>📥 {{ app.downloads }} downloads</span>
            <span>By {{ app.developer_name }}</span>
          </div>
          <a :href="`https://mini-app-sharing.vercel.app/app/${app.slug}`" target="_blank" class="btn" style="display: inline-block; text-decoration: none; font-size: 0.875rem; padding: 0.5rem 1rem; margin-top: 1rem;">
            Launch App →
          </a>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="empty-state">
    <div class="empty-state-icon">🔐</div>
    <h3>Connect Your Wallet</h3>
    <p>Please connect your wallet to access the publisher dashboard</p>
  </div>

  <div class="help-section">
    <h2>Need Help?</h2>
    <ul>
      <li><strong>Documentation</strong>: Read the <a href="/publishing/">Publishing Guide</a></li>
      <li><strong>Contract Address</strong>: Update <code>REGISTRY_ADDRESS</code> after deployment</li>
      <li><strong>Support</strong>: Join our Discord for help</li>
    </ul>
    <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--vp-c-divider);" />
    <p style="margin: 0; font-style: italic; color: var(--vp-c-text-2);">
      This publisher interface allows you to submit apps directly from the docs without writing any code!
    </p>
  </div>

</div>
</template>

<style scoped>
/* Use design system CSS variables with proper fallbacks */
.publisher-container {
  --accent-primary: var(--color-guild-green-300, #81ffba);
  --accent-secondary: var(--color-guild-green-400, #6ce2a1);
  --accent-tertiary: var(--color-guild-green-500, #59cc8a);
  --accent-blue: var(--color-byzantine-blue-400, #0337ff);

  max-width: 1400px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
}

/* Hero Header */
.hero-header {
  text-align: center;
  margin-bottom: 4rem;
  padding: 3rem 0;
  position: relative;
}

.hero-header::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 10%, transparent) 0%, transparent 70%);
  pointer-events: none;
  z-index: -1;
}

.hero-content {
  max-width: 700px;
  margin: 0 auto;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 900;
  color: var(--accent-primary);
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-tertiary) 50%, var(--accent-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 1rem 0;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

/* Ensure title is visible in browsers without gradient text support */
@supports not (-webkit-background-clip: text) {
  .hero-title {
    color: var(--accent-primary);
    background: none;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.125rem;
  }

  .wallet-card-content {
    flex-direction: column;
    align-items: stretch;
  }

  .wallet-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }

  .tabs {
    flex-direction: column;
  }

  .tab {
    text-align: center;
  }

  .content-card {
    padding: 1.75rem;
  }

  .card-title {
    font-size: 1.5rem;
  }

  .apps-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    max-width: 100%;
    padding: 1.5rem;
  }

  .wallet-option {
    padding: 0.875rem;
  }

  .wallet-icon-img {
    width: 2.5rem;
    height: 2.5rem;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .publisher-container {
    padding: 2rem 1rem;
  }

  .wallet-icon-wrapper {
    width: 3rem;
    height: 3rem;
  }

  .wallet-icon-emoji {
    font-size: 1.5rem;
  }

  .wallet-title {
    font-size: 1rem;
  }
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--vp-c-text-2);
  margin: 0;
  font-weight: 400;
  line-height: 1.6;
}

/* Wallet Card - Glassmorphism */
.wallet-card {
  background: linear-gradient(135deg, rgba(129, 255, 186, 0.03) 0%, rgba(0, 255, 249, 0.03) 100%);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(129, 255, 186, 0.1);
  border-radius: 20px;
  margin-bottom: 3rem;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.wallet-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(129, 255, 186, 0.5), transparent);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.wallet-card:hover {
  border-color: rgba(129, 255, 186, 0.4);
  box-shadow: 0 12px 40px rgba(129, 255, 186, 0.15);
  transform: translateY(-2px);
}

.wallet-card:hover::before {
  opacity: 1;
}

.wallet-card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.wallet-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.wallet-icon-wrapper {
  width: 4rem;
  height: 4rem;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 50%, var(--accent-tertiary) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  box-shadow: 0 8px 24px rgba(129, 255, 186, 0.3);
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 8px 24px rgba(129, 255, 186, 0.3);
  }
  50% {
    box-shadow: 0 8px 32px rgba(129, 255, 186, 0.5);
  }
}

.wallet-icon-emoji {
  font-size: 2rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.wallet-details {
  flex: 1;
  min-width: 0;
}

.wallet-title {
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.wallet-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.wallet-address-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.wallet-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  background: linear-gradient(135deg, var(--accent-primary)15 0%, var(--accent-secondary)15 100%);
  border: 1px solid rgba(129, 255, 186, 0.3);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-primary);
}

.wallet-address-mono {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
}

/* Modern Buttons - Web3 Style */
.btn-primary {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 50%, var(--accent-tertiary) 100%);
  color: #000000;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(129, 255, 186, 0.3);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn-primary:hover:not(:disabled)::before {
  left: 100%;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(129, 255, 186, 0.4);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 2px solid rgba(129, 255, 186, 0.2);
  padding: 0.875rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
}

.btn-secondary:hover {
  background: linear-gradient(135deg, rgba(129, 255, 186, 0.05) 0%, rgba(0, 255, 249, 0.05) 100%);
  border-color: rgba(129, 255, 186, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(129, 255, 186, 0.15);
}

.btn {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  color: #000000;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(129, 255, 186, 0.25);
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(129, 255, 186, 0.35);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Wallet Modal - Modern Web3 Design */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: var(--vp-c-bg);
  border: 2px solid rgba(129, 255, 186, 0.15);
  border-radius: 20px;
  padding: 2rem;
  max-width: 28rem;
  width: 100%;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(129, 255, 186, 0.1);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.75rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--vp-c-text-2);
  cursor: pointer;
  padding: 0.25rem;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.close-btn:hover {
  background: linear-gradient(135deg, rgba(129, 255, 186, 0.08) 0%, rgba(0, 255, 249, 0.08) 100%);
  color: var(--vp-c-text-1);
  transform: rotate(90deg);
}

.wallet-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
}

.wallet-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(129, 255, 186, 0.02) 0%, rgba(0, 255, 249, 0.02) 100%);
  border: 2px solid var(--vp-c-divider);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  position: relative;
  overflow: hidden;
}

.wallet-option::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(129, 255, 186, 0.05), transparent);
  transition: left 0.5s ease;
}

.wallet-option:hover:not(.wallet-disabled) {
  background: linear-gradient(135deg, rgba(129, 255, 186, 0.05) 0%, rgba(0, 255, 249, 0.05) 100%);
  border-color: rgba(129, 255, 186, 0.5);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(129, 255, 186, 0.15);
}

.wallet-option:hover:not(.wallet-disabled)::before {
  left: 100%;
}

.wallet-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.wallet-icon-img {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 12px;
  object-fit: contain;
  flex-shrink: 0;
  background: var(--vp-c-bg-soft);
  padding: 0.375rem;
  border: 1px solid var(--vp-c-divider);
}

.wallet-info-text {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.wallet-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--vp-c-text-1);
  margin-bottom: 0.25rem;
  transition: color 0.3s ease;
}

.wallet-option:hover:not(.wallet-disabled) .wallet-name {
  color: var(--accent-primary);
}

.wallet-status {
  font-size: 0.8125rem;
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
  }
}

.modal-footer-text {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--vp-c-text-2);
  text-align: center;
  font-weight: 500;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  background: var(--vp-c-bg-soft);
  padding: 0.5rem;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}

.tab {
  flex: 1;
  padding: 0.875rem 1.5rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--vp-c-text-2);
  transition: all 0.3s ease;
  text-align: center;
}

.tab:hover:not(.active) {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.tab.active {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  color: #000000;
  box-shadow: 0 2px 8px rgba(129, 255, 186, 0.25);
}

/* Content Card - Enhanced */
.content-card {
  background: linear-gradient(135deg, rgba(129, 255, 186, 0.02) 0%, rgba(0, 255, 249, 0.02) 100%);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(129, 255, 186, 0.1);
  border-radius: 20px;
  padding: 2.5rem;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.content-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(129, 255, 186, 0.5), rgba(0, 255, 249, 0.5), transparent);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.content-card:hover {
  border-color: rgba(129, 255, 186, 0.3);
  box-shadow: 0 12px 40px rgba(129, 255, 186, 0.12);
  transform: translateY(-2px);
}

.content-card:hover::before {
  opacity: 1;
}

.card-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.card-subtitle {
  margin: 0 0 2.5rem 0;
  color: var(--vp-c-text-2);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.6;
}

/* Submit Button */
.fee-notice {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.08) 0%, rgba(255, 152, 0, 0.08) 100%);
  border: 1.5px solid rgba(255, 193, 7, 0.3);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.fee-notice-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.fee-notice strong {
  display: block;
  color: var(--vp-c-text-1);
  font-size: 1rem;
  margin-bottom: 0.375rem;
}

.fee-notice p {
  color: var(--vp-c-text-2);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

.btn-submit {
  width: 100%;
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  color: #000000;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(129, 255, 186, 0.25);
  margin-top: 0.5rem;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(129, 255, 186, 0.35);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert {
  padding: 1.125rem 1.25rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert span {
  flex: 1;
}

.alert-close {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: currentColor;
  cursor: pointer;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  opacity: 0.6;
}

.alert-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

.alert::before {
  content: '';
  display: inline-block;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.alert-error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.05) 100%);
  color: #dc2626;
  border: 1.5px solid rgba(239, 68, 68, 0.25);
}

.alert-error::before {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23dc2626'%3E%3Cpath fill-rule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clip-rule='evenodd'/%3E%3C/svg%3E") center / contain no-repeat;
}

.alert-success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(22, 163, 74, 0.05) 100%);
  color: #16a34a;
  border: 1.5px solid rgba(34, 197, 94, 0.25);
}

.alert-success::before {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2316a34a'%3E%3Cpath fill-rule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clip-rule='evenodd'/%3E%3C/svg%3E") center / contain no-repeat;
}

.form-group {
  margin-bottom: 1.75rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.625rem;
  color: var(--vp-c-text-1);
  font-size: 0.9375rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1.5px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 0.9375rem;
  font-family: inherit;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: all 0.2s ease;
}

.form-group input:hover,
.form-group textarea:hover,
.form-group select:hover {
  border-color: rgba(129, 255, 186, 0.4);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 4px rgba(129, 255, 186, 0.08);
  background: var(--vp-c-bg-soft);
}

.form-group textarea {
  min-height: 120px;
  resize: vertical;
  line-height: 1.6;
}

.form-group small {
  display: block;
  margin-top: 0.5rem;
  color: var(--vp-c-text-2);
  font-size: 0.8125rem;
  font-weight: 500;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.permission-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.permission-checkbox input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.permission-checkbox label {
  color: var(--vp-c-text-1);
  font-weight: normal;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.app-card {
  background: linear-gradient(135deg, rgba(129, 255, 186, 0.02) 0%, rgba(0, 255, 249, 0.02) 100%);
  border: 2px solid rgba(129, 255, 186, 0.1);
  border-radius: 16px;
  padding: 1.75rem;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.app-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(129, 255, 186, 0.5), transparent);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.app-card:hover {
  border-color: rgba(129, 255, 186, 0.4);
  box-shadow: 0 8px 24px rgba(129, 255, 186, 0.15);
  transform: translateY(-4px);
}

.app-card:hover::before {
  opacity: 1;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.app-icon {
  font-size: 2.5rem;
  filter: drop-shadow(0 2px 6px rgba(129, 255, 186, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
}

.app-icon-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.75rem;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 0.25rem;
  transition: color 0.3s ease;
}

.app-card:hover .app-title {
  color: var(--accent-primary);
}

.app-category {
  display: inline-block;
  padding: 0.375rem 0.875rem;
  background: linear-gradient(135deg, rgba(129, 255, 186, 0.08) 0%, rgba(0, 255, 249, 0.08) 100%);
  border: 1px solid rgba(129, 255, 186, 0.2);
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--accent-primary);
  text-transform: capitalize;
}

.app-description {
  color: var(--vp-c-text-2);
  margin-bottom: 1.25rem;
  line-height: 1.6;
  font-size: 0.9375rem;
}

.app-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-pending {
  background: rgba(251, 191, 36, 0.1);
  color: #d97706;
}

.status-approved {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.status-rejected {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--vp-c-text-2);
}

.empty-state-icon {
  font-size: 5rem;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 4px 12px rgba(129, 255, 186, 0.2));
  opacity: 0.9;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 0.75rem 0;
}

.empty-state p {
  font-size: 1rem;
  line-height: 1.6;
  font-weight: 500;
}

.help-section {
  margin-top: 4rem;
  padding: 2.5rem;
  background: linear-gradient(135deg, rgba(129, 255, 186, 0.02) 0%, rgba(0, 255, 249, 0.02) 100%);
  border-radius: 20px;
  border: 2px solid rgba(129, 255, 186, 0.1);
  position: relative;
  overflow: hidden;
}

.help-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(129, 255, 186, 0.4), rgba(0, 255, 249, 0.4), transparent);
}

.help-section h2 {
  margin-top: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.help-section ul {
  padding-left: 1.5rem;
}

.help-section li {
  margin-bottom: 0.5rem;
  color: var(--vp-c-text-1);
}

.help-section a {
  color: var(--accent-primary);
  text-decoration: none;
}

.help-section a:hover {
  text-decoration: underline;
}

.help-section code {
  background: var(--vp-c-bg-mute);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.875em;
  color: var(--vp-c-text-code);
}

/* Terms and Conditions Section */
.terms-section {
  margin-top: 2rem;
  margin-bottom: 1.5rem;
}

.terms-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.terms-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.terms-header strong {
  display: block;
  color: var(--vp-c-text-1);
  font-size: 1rem;
  margin-bottom: 0.375rem;
}

.terms-header p {
  color: var(--vp-c-text-2);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

.terms-container {
  border: 2px solid rgba(129, 255, 186, 0.2);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg);
  margin-bottom: 1rem;
}

.terms-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(129, 255, 186, 0.05) 0%, rgba(0, 255, 249, 0.05) 100%);
  border-bottom: 1px solid rgba(129, 255, 186, 0.15);
}

.terms-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--accent-primary);
}

.terms-expand-btn {
  background: transparent;
  border: 1px solid rgba(129, 255, 186, 0.3);
  color: var(--accent-primary);
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.terms-expand-btn:hover {
  background: rgba(129, 255, 186, 0.1);
  border-color: rgba(129, 255, 186, 0.5);
}

.terms-textarea {
  width: 100%;
  height: 300px;
  padding: 1rem;
  border: none;
  resize: none;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  overflow-y: auto;
}

.terms-textarea:focus {
  outline: none;
}

.terms-checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(129, 255, 186, 0.03) 0%, rgba(0, 255, 249, 0.03) 100%);
  border: 2px solid rgba(129, 255, 186, 0.15);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.terms-checkbox-label:hover {
  border-color: rgba(129, 255, 186, 0.4);
  background: linear-gradient(135deg, rgba(129, 255, 186, 0.05) 0%, rgba(0, 255, 249, 0.05) 100%);
}

.terms-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0.125rem;
  accent-color: var(--accent-primary);
  cursor: pointer;
  flex-shrink: 0;
}

.terms-checkbox-text {
  font-size: 0.9375rem;
  color: var(--vp-c-text-1);
  line-height: 1.5;
}

.terms-checkbox-text strong {
  color: var(--accent-primary);
}

/* Terms Modal */
.terms-modal-content {
  background: var(--vp-c-bg);
  border: 2px solid rgba(129, 255, 186, 0.15);
  border-radius: 20px;
  max-width: 800px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(129, 255, 186, 0.1);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.terms-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 2rem;
}

.terms-full-text {
  white-space: pre-wrap;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  margin: 0;
  padding: 1rem 0;
}

.terms-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  border-radius: 0 0 18px 18px;
}

/* Responsive adjustments for terms section */
@media (max-width: 768px) {
  .terms-textarea {
    height: 200px;
    font-size: 0.6875rem;
  }

  .terms-modal-content {
    max-height: 85vh;
  }

  .terms-modal-body {
    padding: 0 1rem;
  }

  .terms-full-text {
    font-size: 0.75rem;
  }

  .terms-modal-footer {
    flex-direction: column;
    padding: 1rem;
  }

  .terms-modal-footer button {
    width: 100%;
  }
}
</style>
