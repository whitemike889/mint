import { useEffect, useRef } from "react";

const useAsyncTimeout = (callback, delay) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    let id;
    const tick = () => {
      const promise = savedCallback.current();

      promise.then(() => {
        id = setTimeout(tick, delay);
      });
    };

    id = setTimeout(tick, delay);
    return () => id && clearTimeout(id);
  }, [delay]);
};

export default useAsyncTimeout;
