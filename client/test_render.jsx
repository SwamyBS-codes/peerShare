// Minimal server-rendering harness for manually checking the call-overlay condition.
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const App = () => {
  const activeCall = { friendUserId: 'test', role: 'caller' };
  const localStream = null;
  const remoteStream = null;
  return (
    <div>
      {activeCall && (localStream || remoteStream) && (
        <div>test</div>
      )}
    </div>
  );
};
console.log(renderToStaticMarkup(<App />));
