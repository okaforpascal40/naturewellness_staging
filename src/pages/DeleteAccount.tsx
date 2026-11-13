import { ContactEmail, LegalPage, LegalSection } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

const DeleteAccount = () => (
  <LegalPage title="Delete your account">
    <p>
      This page explains how to delete your {LEGAL.appName} account and the data linked to it.
    </p>

    <LegalSection heading="Option 1: in the app">
      <p>
        Sign in, open Profile, and tap "Delete my account". Confirm, and your account is deleted
        straight away.
      </p>
    </LegalSection>

    <LegalSection heading="Option 2: by email">
      <p>
        Send an email to <ContactEmail /> from the Google email address you sign in with, using the
        subject line "Delete my account". We will delete your account within 30 days and email you
        when it is done.
      </p>
    </LegalSection>

    <LegalSection heading="What gets deleted">
      <p>
        Your account (name, email address and profile photo), your search history and your
        favourites. We do not keep a copy.
      </p>
      <p>Items saved only on your device are removed when you uninstall the app or clear its data.</p>
    </LegalSection>

    <LegalSection heading="Contact">
      <p>
        {LEGAL.owner}, <ContactEmail />
      </p>
    </LegalSection>
  </LegalPage>
);

export default DeleteAccount;
