import { Link, Route, Routes } from "react-router"
import { SetupPage } from "@/pages/SetupPage"
import { PostPage } from "@/pages/PostPage"
import { HomePage } from "@/pages/HomePage"
import { NewDraftPage } from "@/pages/NewDraftPage"
import { SavedDraftPage } from "@/pages/SavedDraftPage"
import { EditDraftPage } from "@/pages/EditDraftPage"
import { DraftsPage } from "@/pages/DraftsPage"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/page/:page" element={<HomePage />} />
      {import.meta.env.DEV && <Route path="/dev/setup" element={<SetupPage />} />}
      {import.meta.env.DEV && <Route path="/dev/drafts/new" element={<NewDraftPage />} />}
      {import.meta.env.DEV && <Route path="/dev/drafts" element={<DraftsPage />} />}
      {import.meta.env.DEV && <Route path="/dev/drafts/:id/edit" element={<EditDraftPage />} />}
      {import.meta.env.DEV && <Route path="/dev/drafts/:id" element={<SavedDraftPage />} />}
      <Route path="/writing/:slug" element={<PostPage />} />
      <Route path="*" element={<main className="mx-auto max-w-3xl px-5 py-16"><h1 className="text-2xl font-semibold">Page not found</h1><Link className="mt-4 inline-block underline" to="/">Return home</Link></main>} />
    </Routes>
  )
}
