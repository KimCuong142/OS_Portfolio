import { WindowControls } from "#components";
import { blogPosts } from "#constants";
import WindowWrapper from "#hoc/WindowWrapper";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  MoveRight,
  PanelLeft,
  Plus,
  Search,
  Share,
  ShieldHalf,
} from "lucide-react";

const Safari = () => {
  return (
    <>
      <div id="window-header">
        <WindowControls target="safari" />

        <PanelLeft className="ml-2 sm:ml-10 icon hidden sm:block" />

        <div className="flex items-center gap-1 ml-1 sm:ml-5">
          <ChevronLeft className="icon" />
          <ChevronRight className="icon" />
        </div>

        <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-1 min-w-0">
          <ShieldHalf className="icon hidden sm:block flex-shrink-0" />

          <div className="search flex-1 max-w-[400px]">
            <Search className="icon flex-shrink-0" />
            <input
              type="text"
              placeholder="Search or enter website name"
              className="flex-1 min-w-0"
            />
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 sm:gap-5">
          <Share className="icon" />
          <Plus className="icon" />
          <Copy className="icon" />
        </div>
      </div>

      <div className="blog p-4 sm:p-10">
        <h2 className="text-lg sm:text-xl font-bold text-pink-600 mb-6 sm:mb-10">My Develop Blog</h2>
        <div className="space-y-6 sm:space-y-8">
          {blogPosts.map(({ id, image, title, date, link }) => (
            <div key={id} className="blog-post flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-5">
              <div className="w-full sm:col-span-3">
                <img src={image} alt={title} className="w-full sm:size-full rounded-md object-cover max-h-[160px] sm:max-h-none" />
              </div>

              <div className="content sm:col-span-9 space-y-2 sm:space-y-3">
                <p>{date}</p>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">{title}</h3>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  Check out the full post <MoveRight className="icon-hover" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const SafariWindow = WindowWrapper(Safari, "safari");

export default SafariWindow;
