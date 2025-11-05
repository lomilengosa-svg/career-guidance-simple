const { app } = require('./functions/app');
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Development server listening on http://localhost:${PORT}`);
});
