import React from "react";
import { Button } from "@/components/ui/Button";

const DetailRoomButton = ({ onClick }) => (
  <Button
    onClick={onClick}
    className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded shadow hover:bg-primary/80 transition-colors text-sm h-8 min-w-[90px]"
  >
    Ver detalle
  </Button>
);

export default DetailRoomButton;