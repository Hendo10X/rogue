"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  balance: string;
  ipAddress: string;
}

function CopyText({ text, label }: { text: string; label?: string }) {
  if (!text) return <span className="text-muted-foreground/50">—</span>;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success(`${label ?? "Text"} copied`);
      }}
      className="text-left hover:underline underline-offset-2 cursor-pointer"
      title="Click to copy"
    >
      {text}
    </button>
  );
}

function TruncatedIp({ ip }: { ip: string }) {
  if (!ip) return <span className="text-muted-foreground/50">—</span>;

  const parts = ip.split(".");
  const short =
    parts.length >= 2 ? `${parts[0]}.${parts[1]}...` : ip.slice(0, 8) + "…";

  return (
    <span className="group/ip relative inline-block">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(ip);
          toast.success("IP address copied");
        }}
        className="hover:underline underline-offset-2 cursor-pointer"
      >
        {short}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded bg-popover text-popover-foreground border px-2.5 py-1 text-xs font-mono shadow-md opacity-0 transition-opacity group-hover/ip:opacity-100 z-50">
        {ip}
      </span>
    </span>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [adjustingUser, setAdjustingUser] = useState<UserRow | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"credit" | "debit">("credit");
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function fetchUsers() {
    setLoading(true);
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleAdjustBalance() {
    if (!adjustingUser) return;
    const amount = parseFloat(adjustmentAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    if (adjustmentType === "debit" && amount > parseFloat(adjustingUser.balance)) {
      toast.error("Cannot debit more than the user's current balance");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${adjustingUser.id}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, type: adjustmentType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adjust balance");

      toast.success(`Successfully ${adjustmentType}ed ₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`);
      setAdjustingUser(null);
      fetchUsers(); // Refresh list to show new balance
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser() {
    if (!deletingUser) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");

      toast.success("User successfully deleted");
      setDeletingUser(null);
      fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  const query = search.toLowerCase().trim();
  const filteredUsers = query
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.phoneNumber.includes(query)
      )
    : users;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Users Management</h1>
        <span className="text-muted-foreground text-sm">{users.length} total</span>
      </div>

      <Input
        placeholder="Search by name, email, or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Balance (NGN)</TableHead>
              <TableHead className="w-25"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {query ? "No users match your search." : "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <CopyText text={user.phoneNumber} label="Phone" />
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    <TruncatedIp ip={user.ipAddress} />
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(user.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₦{parseFloat(user.balance).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAdjustingUser(user);
                        setAdjustmentAmount("");
                        setAdjustmentType("credit");
                      }}
                    >
                      Adjust
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setDeletingUser(user);
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filteredUsers.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
            {query ? "No users match your search." : "No users found."}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <p className="text-sm font-semibold">
                  ₦{parseFloat(user.balance).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <CopyText text={user.phoneNumber} label="Phone" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">IP Address</p>
                  <span className="font-mono text-xs">
                    <TruncatedIp ip={user.ipAddress} />
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Joined</p>
                  <p>{formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setAdjustingUser(user);
                    setAdjustmentAmount("");
                    setAdjustmentType("credit");
                  }}
                >
                  Adjust
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeletingUser(user)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Deletion Confirmation Modal */}
      <AlertDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete <strong>{deletingUser?.name}</strong>'s
              account and remove all associated data, including wallets, orders, and sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteUser();
              }}
            >
              {submitting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Adjustment Modal */}
      <AlertDialog
        open={!!adjustingUser}
        onOpenChange={(open) => !open && setAdjustingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adjust Wallet Balance</AlertDialogTitle>
            <AlertDialogDescription>
              Modify the NGN balance for <strong>{adjustingUser?.name}</strong>.
              Current balance: ₦{parseFloat(adjustingUser?.balance || "0").toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex gap-2">
              <Button 
                variant={adjustmentType === "credit" ? "default" : "outline"} 
                className="flex-1"
                onClick={() => setAdjustmentType("credit")}
              >
                Add Funds (Credit)
              </Button>
              <Button 
                variant={adjustmentType === "debit" ? "destructive" : "outline"} 
                className="flex-1"
                onClick={() => setAdjustmentType("debit")}
              >
                Remove Funds (Debit)
              </Button>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (NGN)</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="10.00"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <Button
              disabled={submitting || !adjustmentAmount}
              onClick={handleAdjustBalance}
              variant={adjustmentType === "debit" ? "destructive" : "default"}
            >
              {submitting ? "Processing..." : "Confirm Adjustment"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
