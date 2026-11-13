import { ContactEmail, LegalLink, LegalPage, LegalSection } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

const Privacy = () => (
  <LegalPage title="Privacy Policy">
    <p>
      {LEGAL.appName} is owned and run by {LEGAL.owner} ("we", "us"). This policy explains what
      information the app collects, why, who it is shared with, and the choices you have. If you
      have a question, email <ContactEmail />.
    </p>

    <LegalSection heading="What we collect">
      <p>
        <strong>Account details.</strong> If you sign in with Google, we receive your name, email
        address and profile photo from Google. We use them to show your name and avatar in the app
        and to keep your saved items linked to you. You can use the app without signing in.
      </p>
      <p>
        <strong>Search history and favourites.</strong> The conditions you search for and the
        results you save are stored on your device. If you are signed in, they are also stored in
        our database so they appear on your other devices.
      </p>
      <p>
        <strong>Photos you scan.</strong> When you use CamScan, the photo you take or upload is sent
        to our server and passed to Plant.id (run by Kindwise) to identify the plant. We do not save
        the photo.
      </p>
      <p>
        <strong>Voice search.</strong> If you use the microphone button, your browser's built-in
        speech recognition turns your speech into text. On Chrome and Android this is handled by
        Google. We receive only the resulting text.
      </p>
      <p>
        <strong>What we do not collect.</strong> We do not use advertising trackers or analytics
        tools, and we do not sell your information.
      </p>
    </LegalSection>

    <LegalSection heading="Who we share information with">
      <p>We use these services to run the app. Each one receives only what it needs:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Supabase:</strong> sign-in and storage of your account, search history and
          favourites.
        </li>
        <li>
          <strong>Google:</strong> sign-in, and speech recognition if you use voice search.
        </li>
        <li>
          <strong>Plant.id (Kindwise):</strong> the photos you scan, for plant identification.
        </li>
        <li>
          <strong>Anthropic:</strong> the condition name and research results shown on screen, to
          write the plain-language summary. Your name and email are not sent.
        </li>
        <li>
          <strong>Open Targets:</strong> the condition names you search for, to find related
          research.
        </li>
        <li>
          <strong>Vercel and Railway:</strong> hosting for the app and its server.
        </li>
      </ul>
      <p>We may disclose information if the law requires it.</p>
    </LegalSection>

    <LegalSection heading="How long we keep it">
      <p>
        Your account, search history and favourites are kept until you delete them or delete your
        account. Items stored only on your device stay there until you clear them or uninstall the
        app.
      </p>
    </LegalSection>

    <LegalSection heading="Your choices and rights">
      <p>
        You can view and remove your history and favourites in the app at any time. You can delete
        your account and all data linked to it from the Profile page, or by following the steps at{" "}
        <LegalLink to="/delete-account">/delete-account</LegalLink>. You can also email{" "}
        <ContactEmail /> to ask for a copy of your data, to correct it, or to have it deleted. We
        will reply within 30 days.
      </p>
      <p>
        {LEGAL.owner} is registered in South Africa, so we handle your information under the
        Protection of Personal Information Act 2013 (POPIA). If you are unhappy with how we handle
        your information, you can complain to South Africa's Information Regulator. If you are in
        Nigeria, the Nigeria Data Protection Act 2023 also gives you these rights. If you are in the
        UK or the European Union, the GDPR gives you the same rights, plus the right to complain to
        your local data protection authority.
      </p>
    </LegalSection>

    <LegalSection heading="Children">
      <p>
        The app is meant for adults. If you are under 18, please use it only with the permission of
        a parent or guardian.
      </p>
    </LegalSection>

    <LegalSection heading="Security">
      <p>
        Information is sent over encrypted connections (HTTPS). Database access is limited so that
        each signed-in user can only reach their own history and favourites.
      </p>
    </LegalSection>

    <LegalSection heading="Changes to this policy">
      <p>
        If we change this policy, we will update the effective date at the top of this page. If the
        change is significant, we will tell you in the app.
      </p>
    </LegalSection>

    <LegalSection heading="Contact">
      <p>
        {LEGAL.owner}, <ContactEmail />
      </p>
    </LegalSection>
  </LegalPage>
);

export default Privacy;
