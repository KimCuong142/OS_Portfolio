const navLinks = [
  {
    id: 1,
    name: "Projects",
    type: "finder",
  },
  {
    id: 3,
    name: "Contact",
    type: "contact",
  },
  {
    id: 4,
    name: "Resume",
    type: "resume",
  },
];

const navIcons = [
  {
    id: 1,
    img: "/icons/wifi.svg",
  },
  {
    id: 2,
    img: "/icons/search.svg",
  },
  {
    id: 3,
    img: "/icons/user.svg",
  },
  {
    id: 4,
    img: "/icons/mode.svg",
  },
];

const dockApps = [
  {
    id: "finder",
    name: "Finder", // was "Finder"
    icon: "finder.png",
    canOpen: true,
  },
  {
    id: "safari",
    name: "Articles", // was "Safari"
    icon: "safari.png",
    canOpen: true,
  },
  {
    id: "photos",
    name: "Gallery", // was "Photos"
    icon: "photos.png",
    canOpen: true,
  },
  {
    id: "contact",
    name: "Contact", // or "Get in touch"
    icon: "contact.png",
    canOpen: true,
  },
  {
    id: "terminal",
    name: "Skills", // was "Terminal"
    icon: "terminal.png",
    canOpen: true,
  },
  {
    id: "trash",
    name: "Archive", // was "Trash"
    icon: "trash.png",
    canOpen: false,
  },
];

// 2077 HUD bottom-bar function keys (label -> window id)
const cyberKeys = [
  { label: "BIO", id: "resume" },
  { label: "VAULT", id: "finder" },
  { label: "REEL", id: "photos" },
  { label: "OPS", id: "terminal" },
  { label: "MERIT", id: "resume" },
  { label: "CODEX", id: "safari" },
  { label: "PORT", id: "finder" },
  { label: "UPLINK", id: "contact" },
];

const blogPosts = [
  {
    id: 1,
    date: "Sep 2, 2025",
    title:
      "TypeScript Explained: What It Is, Why It Matters, and How to Master It",
    image: "/images/blog1.png",
    link: "https://nodejs.org/en/learn/typescript/introduction",
  },
  {
    id: 2,
    date: "Aug 28, 2025",
    title: "The Ultimate Guide to Mastering Three.js for 3D Development",
    image: "/images/blog2.png",
    link: "https://youtu.be/DEeaT6FxEws?si=DcmDVO0V28lOtFej",
  },
  {
    id: 3,
    date: "Aug 15, 2025",
    title: "The Ultimate Guide to Mastering GSAP Animations",
    image: "/images/blog3.png",
    link: "https://jsmastery.com/blog/the-ultimate-guide-to-mastering-gsap-animations",
  },
];

const techStack = [
  {
    category: "Languages",
    items: ["TypeScript", "JavaScript", "Swift", "Kotlin", "Java", "Python"],
  },
  {
    category: "Mobile",
    items: ["SwiftUI", "Jetpack Compose", "Core Data", "Room", "WidgetKit"],
  },
  {
    category: "Web / Frontend",
    items: ["React.js", "Next.js", "Tailwind CSS", "Redux Toolkit", "TanStack Query"],
  },
  {
    category: "Architecture",
    items: ["MVVM", "Repository Pattern", "Clean Architecture"],
  },
  {
    category: "Cloud & Backend",
    items: ["RESTful APIs", "WebSockets", "Firebase", "CloudKit"],
  },
  {
    category: "Dev Tools & AI",
    items: ["Git", "GitHub", "Docker", "Postman", "Gemini AI", "Figma"],
  },
];

const socials = [
  {
    id: 1,
    text: "Github",
    icon: "/icons/github.svg",
    bg: "#f4656b",
    link: "https://github.com/KimCuong142",
  },
  {
    id: 2,
    text: "LinkedIn",
    icon: "/icons/linkedin.svg",
    bg: "#05b6f6",
    link: "https://www.linkedin.com/in/kim-cuong-huynh-26240b1a0",
  },
];

const photosLinks = [
  {
    id: 1,
    icon: "/icons/gicon1.svg",
    title: "Library",
  },
  {
    id: 2,
    icon: "/icons/gicon2.svg",
    title: "Memories",
  },
  {
    id: 3,
    icon: "/icons/file.svg",
    title: "Places",
  },
  {
    id: 4,
    icon: "/icons/gicon4.svg",
    title: "People",
  },
  {
    id: 5,
    icon: "/icons/gicon5.svg",
    title: "Favorites",
  },
];

const gallery = [
  {
    id: 1,
    img: "/images/gal5.JPG",
  },
  {
    id: 2,
    img: "/images/IMG_6452.JPG",
  },
  {
    id: 3,
    img: "/images/IMG_9496.JPG",
  },
  {
    id: 4,
    img: "/images/IMG_6895.JPG",
  },
];

export {
  navLinks,
  navIcons,
  dockApps,
  cyberKeys,
  blogPosts,
  techStack,
  socials,
  photosLinks,
  gallery,
};

const WORK_LOCATION = {
  id: 1,
  type: "work",
  name: "Work",
  icon: "/icons/work.svg",
  kind: "folder",
  children: [
    // ▶ Project 1
    {
      id: 5,
      name: "Hi-Vision Website",
      icon: "/images/folder.png",
      kind: "folder",
      position: "top-10 left-5", // icon position inside Finder
      windowPosition: "top-14 right-6", // desktop folder position
      children: [
        {
          id: 1,
          name: "Hi-Vision Project.txt",
          icon: "/images/txt.png",
          kind: "file",
          fileType: "txt",
          position: "top-5 left-10",
          description: [
            "Hi-Vision is a streamlined and modern platform designed for managing patient records effortlessly.",
            "Instead of a complex database, it delivers an intuitive experience with clear data visualization, organized dashboards, and seamless workflows for medical staff.",
            "Think of it as a digital command center for the hospital—empowering doctors and admins to access critical health insights instantly.",
            "Built with robust technology, it ensures high security, fast performance, and a professional, responsive interface tailored for the healthcare environment.",
          ],
        },
        {
          id: 2,
          name: "hi-vision.com",
          icon: "/images/safari.png",
          kind: "file",
          fileType: "url",
          href: "https://hi-vision.io/",
          position: "top-10 right-20",
        },
        {
          id: 4,
          name: "hi-vision.png",
          icon: "/images/image.png",
          kind: "file",
          fileType: "img",
          position: "top-52 right-80",
          imageUrl: "/images/project-1.png",
        },
        {
          id: 5,
          name: "Design.fig",
          icon: "/images/plain.png",
          kind: "file",
          fileType: "fig",
          href: "https://www.figma.com/design/aCj9yPaQUpJDNYG3HO2JCG/Prototype?node-id=182-4850&t=Jfra5kbBa8j8mgeO-1",
          position: "top-60 right-20",
        },
      ],
    },

    // ▶ Project 2
    {
      id: 6,
      name: "Happy Paw Website",
      icon: "/images/folder.png",
      kind: "folder",
      position: "top-52 left-40",
      windowPosition: "top-[10.5rem] right-6",
      children: [
        {
          id: 1,
          name: "Happy Paw Website Project.txt",
          icon: "/images/txt.png",
          kind: "file",
          fileType: "txt",
          position: "top-5 right-10",
          description: [
            "Happy Paw is a comprehensive platform designed to streamline pet service bookings and luxury hotel stays.",
            "Instead of manual scheduling or messy spreadsheets, it connects pet owners with services while providing staff and admins with powerful operational tools.",
            "Think of it like a dedicated concierge for furry friends—ensuring seamless check-ins for pets and total control over resources for the business.",
            "It's built with Next.js and NestJS, ensuring a scalable, high-performance architecture that remains stable and responsive for both customers and management.",
          ],
        },
        {
          id: 2,
          name: "happy-paw.com",
          icon: "/images/safari.png",
          kind: "file",
          fileType: "url",
          href: "https://happy-paw-nu.vercel.app/",
          position: "top-20 left-20",
        },
        {
          id: 4,
          name: "happy-paw.png",
          icon: "/images/image.png",
          kind: "file",
          fileType: "img",
          position: "top-52 left-80",
          imageUrl: "/images/project-2.png",
        },
        {
          id: 5,
          name: "Design.fig",
          icon: "/images/plain.png",
          kind: "file",
          fileType: "fig",
          href: "https://google.com",
          position: "top-60 left-5",
        },
      ],
    },

    // ▶ Project 4
    {
      id: 7,
      name: "ResQ Mien Trung",
      icon: "/images/folder.png",
      kind: "folder",
      position: "top-52 left-5",
      windowPosition: "top-[17.5rem] right-6",
      children: [
        {
          id: 1,
          name: "ResQ Mien Trung Project.txt",
          icon: "/images/txt.png",
          kind: "file",
          fileType: "txt",
          position: "top-5 left-10",
          description: [
            "ResQ Miền Trung is a web application designed to support disaster relief efforts, specifically connecting people in need with 'người cứu hộ'.",
            "The platform allows users to send SOS requests and coordinators to manage resources efficiently.",
            "It is heavily focused on an optimal grid-based UI with clear CTAs for high-pressure situations.",
          ],
        },
        {
          id: 2,
          name: "resq-mientrung.com",
          icon: "/images/safari.png",
          kind: "file",
          fileType: "url",
          href: "https://resq-sos.vercel.app/",
          position: "top-10 right-20",
        },
        {
          id: 4,
          name: "resq-mientrung-coordinator.png",
          icon: "/images/image.png",
          kind: "file",
          fileType: "img",
          position: "top-52 right-80",
          imageUrl: "/images/project-4.jpg",
        },
        {
          id: 5,
          name: "resq-mientrung-admin.png",
          icon: "/images/image.png",
          kind: "file",
          fileType: "img",
          position: "top-52 right-50",
          imageUrl: "/images/dashboard-admin.jpg",
        },
        {
          id: 6,
          name: "Design.fig",
          icon: "/images/plain.png",
          kind: "file",
          fileType: "fig",
          href: "https://www.figma.com/board/OTfvjs2g3akCzoB0zZG4iv/UX-Research-ResQ?node-id=0-1&t=DCupZy7sy4rj5Zln-1",
          position: "top-60 right-20",
        },
      ],
    },

    // ▶ Project 5
    {
      id: 8,
      name: "KoiNe",
      icon: "/images/folder.png",
      kind: "folder",
      position: "top-10 left-40",
      windowPosition: "top-[24.5rem] right-6",
      children: [
        {
          id: 1,
          name: "KoiNe Project.txt",
          icon: "/images/txt.png",
          kind: "file",
          fileType: "txt",
          position: "top-5 left-10",
          description: [
            "Developing a web-app to manage Koi fish veterinary services, including bookings, doctor assignments, customer profiles, feedback, and reporting",
          ],
        },
      ],
    },
  ],
};

const ABOUT_LOCATION = {
  id: 2,
  type: "about",
  name: "About me",
  icon: "/icons/info.svg",
  kind: "folder",
  children: [
    {
      id: 1,
      name: "me.png",
      icon: "/images/image.png",
      kind: "file",
      fileType: "img",
      position: "top-10 left-5",
      imageUrl: "/images/kcuong.JPG",
    },
    {
      id: 2,
      name: "casual-me.png",
      icon: "/images/image.png",
      kind: "file",
      fileType: "img",
      position: "top-28 right-72",
      imageUrl: "/images/IMG_6895.JPG",
    },
    {
      id: 3,
      name: "conference-me.png",
      icon: "/images/image.png",
      kind: "file",
      fileType: "img",
      position: "top-52 left-80",
      imageUrl: "/images/IMG_9496.JPG",
    },
    {
      id: 4,
      name: "about-me.txt",
      icon: "/images/txt.png",
      kind: "file",
      fileType: "txt",
      position: "top-60 left-5",
      subtitle: "Web & Mobile Developer",
      image: "/images/kcuong.JPG",
      description: [
        "Hey! I’m Kim Cuong 👋, a Web & Mobile Developer based in Ho Chi Minh City, studying Software Engineering at FPT University.",
        "I specialize in building high-performance native mobile apps with Swift/SwiftUI and Kotlin/Jetpack Compose, alongside modern, interactive web applications with React, Next.js, and TypeScript.",
        "I have hands-on experience in clean architecture (MVVM, Repository Pattern), offline mesh networking, real-time communication, and AI-powered integrations like Google Gemini AI.",
      ],
    },
  ],
};

const RESUME_LOCATION = {
  id: 3,
  type: "resume",
  name: "Resume",
  icon: "/icons/file.svg",
  kind: "folder",
  children: [
    {
      id: 1,
      name: "Resume.pdf",
      icon: "/images/pdf.png",
      kind: "file",
      fileType: "pdf",
      // you can add `href` if you want to open a hosted resume
      // href: "/your/resume/path.pdf",
    },
  ],
};

const TRASH_LOCATION = {
  id: 4,
  type: "trash",
  name: "Trash",
  icon: "/icons/trash.svg",
  kind: "folder",
  children: [
    {
      id: 1,
      name: "trash1.png",
      icon: "/images/image.png",
      kind: "file",
      fileType: "img",
      position: "top-10 left-10",
      imageUrl: "/images/trash-1.png",
    },
    {
      id: 2,
      name: "trash2.png",
      icon: "/images/image.png",
      kind: "file",
      fileType: "img",
      position: "top-40 left-80",
      imageUrl: "/images/trash-2.png",
    },
  ],
};

export const locations = {
  work: WORK_LOCATION,
  about: ABOUT_LOCATION,
  resume: RESUME_LOCATION,
  trash: TRASH_LOCATION,
};

const INITIAL_Z_INDEX = 1000;

const WINDOW_CONFIG = {
  finder: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null },
  contact: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null },
  resume: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null },
  safari: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null },
  photos: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null },
  terminal: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null },
  txtfile: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null },
  imgfile: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null },
};

export { INITIAL_Z_INDEX, WINDOW_CONFIG };
