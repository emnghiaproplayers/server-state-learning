import { QueryProvider } from './components/QueryProvider';
import { CommentsBoard } from './components/CommentsBoard';

export default function App() {
  return (
    <QueryProvider>
      <main className="app-shell">
        <CommentsBoard />
      </main>
    </QueryProvider>
  );
}
