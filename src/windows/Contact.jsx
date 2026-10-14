import { WindowControls } from "#components";
import { socials } from "#constants";
import WindowWrapper from "#hoc/WindowWrapper";

const Contact = () => {
  return (
    <>
      <div id="window-header">
        <WindowControls target="contact" />
        <h2>Contact me</h2>
      </div>

      <div className="p-5 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
        <div className="flex items-center gap-4 sm:gap-5">
          <img
            src="/images/kcuong.JPG"
            alt="Kim Cuong"
            className="size-20 sm:size-24 rounded-full object-cover flex-shrink-0"
          />
          <div className="space-y-1 min-w-0">
            <h3>Let's Connect</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Got an idea? A bug to squash? Or just wanna talk tech? I'm in.
            </p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs sm:text-sm">
          <p className="flex items-center gap-2">
            <span className="contact-label font-semibold text-gray-700 min-w-12">Mail:</span>
            <a
              href="mailto:huynhkimcuong53@gmail.com"
              className="email-link text-blue-600 hover:underline"
            >
              huynhkimcuong53@gmail.com
            </a>
          </p>
          <p className="flex items-center gap-2">
            <span className="contact-label font-semibold text-gray-700 min-w-12">Phone:</span>
            <a
              href="tel:0792191402"
              className="phone-link text-blue-600 hover:underline"
            >
              0792191402
            </a>
          </p>
        </div>

        <ul>
          {socials.map(({ id, bg, link, icon, text }) => (
            <li key={id} style={{ backgroundColor: bg }}>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                title={text}
              >
                <img src={icon} alt={text} className="size-5" />
                <p>{text}</p>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

const ContactWindow = WindowWrapper(Contact, "contact");

export default ContactWindow;
