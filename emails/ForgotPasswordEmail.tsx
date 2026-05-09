import {
  Html,
  Head,
  Font,
  Preview,
  Heading,
  Row,
  Section,
  Text,
  Button,
} from '@react-email/components';

interface ForgotPasswordEmailProps {
  username: string;
  resetLink: string;
}

export default function ForgotPasswordEmail({ username, resetLink }: ForgotPasswordEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <title>Reset Your Password</title>
        <Font
          fontFamily="Roboto"
          fallbackFontFamily="Verdana"
          webFont={{
            url: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>Reset your True Feedback password</Preview>
      <Section>
        <Row>
          <Heading as="h2">Hello {username},</Heading>
        </Row>
        <Row>
          <Text>
            We received a request to reset your password. Click the button below to
            choose a new password. This link expires in 1 hour.
          </Text>
        </Row>
        <Row>
          <Button
            href={resetLink}
            style={{
              background: '#1d4ed8',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 'bold',
            }}
          >
            Reset Password
          </Button>
        </Row>
        <Row>
          <Text>
            If the button above does not work, copy and paste the following link into
            your browser:
          </Text>
        </Row>
        <Row>
          <Text style={{ wordBreak: 'break-all', color: '#1d4ed8' }}>{resetLink}</Text>
        </Row>
        <Row>
          <Text>
            If you did not request a password reset, please ignore this email. Your
            password will not be changed.
          </Text>
        </Row>
      </Section>
    </Html>
  );
}
