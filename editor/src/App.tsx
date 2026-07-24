import { QueryProvider } from './components/QueryProvider';
import { UserEditor } from './components/UserEditor';

export default function App() {
  return (
    <QueryProvider>
      <main className="app-shell">
        <UserEditor />
      </main>
    </QueryProvider>
  );
}
