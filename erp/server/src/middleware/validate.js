const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (e) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: e.errors.map(err => ({ path: err.path, message: err.message })) 
    });
  }
};

export default validate;
