import Boot from "@/components/Boot";
import Workspace from "@/components/Workspace";

/**
 * The whole site: a boot screen to start on, then a desktop with one
 * terminal on it and a plus button in the top bar for more.
 */
export default function Home() {
  return (
    <>
      <Boot />
      <Workspace />
    </>
  );
}
