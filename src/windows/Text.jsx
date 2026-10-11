import { WindowControls } from "#components";
import WindowWrapper from "#hoc/WindowWrapper";
import useWindowStore from "#store/window";

const Text = () => {
  const { windows } = useWindowStore();
  const data = windows.txtfile.data;

  if (!data) return null;

  return (
    <>
      <div id="window-header">
        <WindowControls target="txtfile" />
        <h2>{data.name}</h2>
      </div>

      <div className="p-5 space-y-6 bg-white flex-1 overflow-y-auto">
        {data.subtitle && (
          <h2 className="text-file-subtitle">{data.subtitle}</h2>
        )}

        {data.image && (
          <img
            src={data.image}
            alt={data.name}
            className="text-file-image"
            loading="lazy"
          />
        )}

        <div className="text-file-description">
          {data.description?.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </>
  );
};

const TextWindow = WindowWrapper(Text, "txtfile");

export default TextWindow;
