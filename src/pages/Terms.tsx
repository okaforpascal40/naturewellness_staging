import { ContactEmail, LegalPage, LegalSection } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

const Terms = () => (
  <LegalPage title="Terms of Service">
    <p>
      These terms apply when you use {LEGAL.appName}, which is owned and run by {LEGAL.owner}. By
      using the app, you agree to them.
    </p>

    <LegalSection heading="What the app does">
      <p>
        {LEGAL.appName} suggests fruits, vegetables and other plant foods that published research
        links to a health condition. It draws on public biomedical databases, including the
        Comparative Toxicogenomics Database and Open Targets, and shows the sources behind each
        suggestion.
      </p>
    </LegalSection>

    <LegalSection heading="Not medical advice">
      <p>
        The app is for education and general wellness information only. It does not diagnose, treat
        or cure any condition, and it is not a substitute for a doctor, pharmacist or other qualified
        health professional. Talk to a health professional before changing your diet to manage a
        condition, especially if you are pregnant, take medication or have allergies. If you have a
        medical emergency, contact your local emergency services straight away.
      </p>
    </LegalSection>

    <LegalSection heading="Accuracy">
      <p>
        Research findings change, and public databases can contain errors. We work to present the
        data accurately, but we do not promise that every result is complete, current or correct.
      </p>
    </LegalSection>

    <LegalSection heading="Your account">
      <p>
        You can sign in with Google. You are responsible for activity on your account. You can
        delete your account at any time from the Profile page.
      </p>
    </LegalSection>

    <LegalSection heading="Acceptable use">
      <p>
        Do not misuse the app. This includes trying to break or overload it, copying its data in
        bulk with automated tools, reverse engineering it, or using it to break the law.
      </p>
    </LegalSection>

    <LegalSection heading="Ownership">
      <p>
        The app, its design and its written content belong to {LEGAL.owner}. Data from third-party
        databases stays under the licences of the organisations that publish it.
      </p>
    </LegalSection>

    <LegalSection heading="Cost">
      <p>
        The app is currently free to use. If we introduce paid features, we will tell you clearly
        before you are charged.
      </p>
    </LegalSection>

    <LegalSection heading="Limits on our liability">
      <p>
        The app is provided as it is. To the extent the law allows, {LEGAL.owner} is not responsible
        for any loss or harm that comes from relying on information in the app. Nothing in these
        terms removes rights that the law says cannot be removed.
      </p>
    </LegalSection>

    <LegalSection heading="Changes and ending use">
      <p>
        We may update these terms, and we will change the effective date when we do. We may suspend
        access for anyone who breaks them. You can stop using the app at any time.
      </p>
    </LegalSection>

    <LegalSection heading="Governing law">
      <p>These terms are governed by the laws of {LEGAL.governingLaw}.</p>
    </LegalSection>

    <LegalSection heading="Contact">
      <p>
        {LEGAL.owner}, <ContactEmail />
      </p>
    </LegalSection>
  </LegalPage>
);

export default Terms;
