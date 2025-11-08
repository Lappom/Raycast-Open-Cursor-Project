import { Form } from "@raycast/api";

export default function Preferences() {
  return (
    <Form>
      <Form.Description
        title="About"
        text="Configure your project scanning and Git cloning preferences"
      />
    </Form>
  );
}

