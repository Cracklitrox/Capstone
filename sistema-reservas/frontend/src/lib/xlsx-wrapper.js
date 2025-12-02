// Wrapper para xlsx-populate UMD
const script = document.createElement('script');
script.src = '/src/lib/xlsx-populate.min.js';
document.head.appendChild(script);

export default new Promise((resolve) => {
  script.onload = () => {
    resolve(window.XlsxPopulate);
  };
});
