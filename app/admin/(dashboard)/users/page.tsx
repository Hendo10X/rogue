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
  createdAt: string;
  balance: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [adjustingUser, setAdjustingUser] = useState<UserRow | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"credit" | "debit">("credit");
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

  if (loading && users.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  const query = search.toLowerCase().trim();
  const filteredUsers = query
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      )
    : users;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Users Management</h1>
        <span className="text-muted-foreground text-sm">{users.length} total</span>
      </div>

      <Input
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Balance (NGN)</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
