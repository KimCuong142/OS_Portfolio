import { WindowControls } from "#components";
import { techStack } from "#constants";
import WindowWrapper from "#hoc/WindowWrapper";
import useWindowStore from "#store/window";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Check, Flag } from "lucide-react";
import { useRef } from "react";

const Terminal = () => {
  const containerRef = useRef(null);
  const { windows } = useWindowStore();
  const isOpen = windows.terminal.isOpen;

  useGSAP(() => {
    if (!containerRef.current || !isOpen) return;

    const container = containerRef.current;
    const command = container.querySelector(".command-text");
    const label = container.querySelector(".label");
    const items = container.querySelectorAll(".content > li");
    const footnote = container.querySelector(".footnote");

    // Reset all elements
    gsap.set([command, label, items, footnote], { opacity: 0, y: 10 });

    const tl = gsap.timeline({ delay: 0.3 });

    // Typing effect for command
    tl.to(command, {
      opacity: 1,
      y: 0,
      duration: 0.3,
      ease: "power2.out",
    });

    // Show label
    tl.to(
      label,
      {
        opacity: 1,
        y: 0,
        duration: 0.2,
        ease: "power2.out",
      },
      "+=0.2"
    );

    // Stagger each tech stack item
    tl.to(
      items,
      {
        opacity: 1,
        y: 0,
        duration: 0.3,
        stagger: 0.15,
        ease: "power2.out",
      },
      "+=0.1"
    );

    // Show footnote
    tl.to(
      footnote,
      {
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: "power2.out",
      },
      "+=0.2"
    );

    return () => tl.kill();
  }, [isOpen]);

  return (
    <>
      <div id="window-header">
        <WindowControls target="terminal" />
        <h2>Tech Stack</h2>
      </div>

      <div className="techstack" ref={containerRef}>
        <p className="command-text">
          <span className="font-bold">@kcuong %</span>
          <span className="typing-text"> show tech stack</span>
          <span className="cursor">▋</span>
        </p>

        <div className="label">
          <p className="w-32">Category</p>
          <p>Technologies</p>
        </div>

        <ul className="content">
          {techStack.map(({ category, items }) => (
            <li key={category} className="flex items-center">
              <Check className="check" size="20" />
              <h3>{category}</h3>
              <ul>
                {items.map((item, i) => (
                  <li key={i}>
                    {item}
                    {i < items.length - 1 ? ", " : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <div className="footnote">
          <p>
            <Check size={20} />{techStack.length} of {techStack.length} stacks loaded successfully (100%)
          </p>

          <p className="text-black">
            <Flag size={15} fill="black" />
            Render time: 6ms
          </p>
        </div>
      </div>
    </>
  );
};

const TerminalWindow = WindowWrapper(Terminal, "terminal");

export default TerminalWindow;
