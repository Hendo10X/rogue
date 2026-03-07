"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Notification03Icon } from "@hugeicons/core-free-icons";

function parseLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="underline font-bold hover:opacity-80 transition-opacity cursor-pointer"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

interface Announcement {
  active: boolean;
  type: "banner" | "modal";
  message: string;
  id: string;
}

export function AnnouncementBanner({
  announcement,
}: {
  announcement: Announcement;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!announcement?.active) return;

    // Check if user has dismissed this specific announcement
    const dismissedStore = localStorage.getItem("site_announcement_dismissed");
    
    if (dismissedStore) {
      try {
        const { id, expiresAt } = JSON.parse(dismissedStore);
        // If the ID matches the current announcement AND it hasn't expired yet
        if (id === announcement.id && Date.now() < expiresAt) {
          return; // Do not show
        }
      } catch (e) {
        // failed to parse, ignore
      }
    }

    // Otherwise, show it
    setOpen(true);
  }, [announcement]);

  if (!mounted || !announcement?.active || !open) return null;

  const handleDismissForever = () => {
    setOpen(false);
    // Setting expiration far into the future (10 years)
    localStorage.setItem("site_announcement_dismissed", JSON.stringify({
      id: announcement.id,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 365 * 10
    }));
  };

  const handleDismiss3Hours = () => {
    setOpen(false);
    // 3 hours from now
    localStorage.setItem("site_announcement_dismissed", JSON.stringify({
      id: announcement.id,
      expiresAt: Date.now() + 1000 * 60 * 60 * 3
    }));
  };

  if (announcement.type === "banner") {
    return (
      <div className="bg-primary text-primary-foreground relative z-50 flex items-center justify-center px-4 py-3 sm:px-6 lg:px-8">
        <div className="mr-8 pr-16 sm:text-center">
          <p className="font-medium">
            <HugeiconsIcon icon={Notification03Icon} className="mr-2 inline size-5" />
            <span className="whitespace-pre-wrap">{parseLinks(announcement.message)}</span>
          </p>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hover:bg-primary/90 text-primary-foreground focus:ring-offset-primary rounded-md p-2 focus:ring-2 focus:ring-white focus:outline-none"
            onClick={handleDismissForever}
          >
            <span className="sr-only">Dismiss</span>
            <HugeiconsIcon icon={Cancel01Icon} className="size-6" />
          </Button>
        </div>
      </div>
    );
  }

  // Modal type
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Notification03Icon} className="text-primary size-5" />
            Announcement
          </AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap pt-4 text-sm text-foreground">
            {parseLinks(announcement.message)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between">
          <Button variant="outline" className="rounded-full" onClick={handleDismiss3Hours}>
            Hide for 3 hours
          </Button>
          <AlertDialogAction onClick={handleDismissForever} className="rounded-full">
            Understood
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
