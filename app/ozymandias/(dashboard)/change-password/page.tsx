import { redirect } from "next/navigation";

// Admin passwords are retired — Ozymandias opens from an allowed email's Rogue
// account. Old links to this page land on the overview.
export default function ChangePasswordPage() {
  redirect("/ozymandias");
}
