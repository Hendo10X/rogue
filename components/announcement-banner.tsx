"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification03Icon } from "@hugeicons/core-free-icons";

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
          className="cursor-pointer font-bold underline transition-opacity hover:opacity-80"
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
  const [modalOpen, setModalOpen] = useState(true);

  if (!announcement?.active) return null;

  if (announcement.type === "banner") {
    return (
      <div className="bg-primary text-primary-foreground relative z-50 flex items-center justify-center px-4 py-3 sm:px-6 lg:px-8">
        <p className="text-center font-medium">
          <HugeiconsIcon icon={Notification03Icon} className="mr-2 inline size-5" />
          <span className="whitespace-pre-wrap">{parseLinks(announcement.message)}</span>
        </p>
      </div>
    );
  }

  return (
    <AlertDialog open={modalOpen} onOpenChange={setModalOpen}>
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
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setModalOpen(false)} className="rounded-full">
            Understood
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
