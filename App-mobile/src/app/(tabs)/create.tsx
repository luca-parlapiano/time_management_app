import { Redirect } from 'expo-router';

/** Il pulsante centrale apre la scelta del percorso senza cambiare tab. */
export default function CreateTabRoute() {
  return <Redirect href="/" />;
}
