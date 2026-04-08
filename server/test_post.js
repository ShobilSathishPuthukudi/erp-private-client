import fetch from 'node-fetch';
async function test() {
  const payload = {
    name: 'test sub dept xyz',
    shortName: 'tsdx',
    type: 'sub-department',
    parentId: "73" // using ID from earlier
  };
  
  // NOTE: need valid token. It might be easier to just mock the token or see the terminal logs directly
}
