import { WindowControls } from "#components";
import WindowWrapper from "#hoc/WindowWrapper";
import useWindowStore from "#store/window";

const Image = () => {
  const { windows } = useWindowStore();
  const data = windows.imgfile.data;

  if (!data) return null;

  return (
    <>
      <div id="window-header">
        <WindowControls target="imgfile" />
        <h2>{data.name}</h2>
      </div>

      <div className="image-file-content flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center bg-gray-50">
        <h1 className="image-file-title">{data.title}</h1>

        {data.imageUrl && (
          <img
            src={data.imageUrl}
            alt={data.title}
            className="image-file-image"
            loading="lazy"
          />
        )}
      </div>
    </>
  );
};

const ImageWindow = WindowWrapper(Image, "imgfile");

export default ImageWindow;
