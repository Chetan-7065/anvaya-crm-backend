const { initializeDatabase } = require("./db/db.connect");
require("dotenv").config();
const mongoose = require("mongoose");
const lead = require("./models/lead.models");
const comment = require("./models/comment.models");
const salesAgent = require("./models/salesAgent.models");
const tag = require("./models/tag.models");
const express = require("express");
const app = express();
app.use(express.json());
initializeDatabase();

const cors = require("cors");
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.send("Hello , Express server");
});

async function createNewSalesAgent(newSalesAgentDetails) {
  try {
    const newSalesAgent = new salesAgent(newSalesAgentDetails);
    const saveSalesAgent = await newSalesAgent.save();
    return saveSalesAgent;
  } catch (error) {
    throw error;
  }
}

app.post("/agents/:name", async (req, res) => {
  try {
      const agentName = req.params.name; 
      const {name, email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Invalid input: 'email' must be a valid email address.",
      });
    }

    const existingAgent = await salesAgent.findOne({name: agentName });
    if (!existingAgent) {
      return res.status(409).json({
        error: `Sales agent with name "${agentName}" does not exists.`,
      });
    }
    const updateSalesAgent = await updateSalesAgentByName(agentName, req.body);
    if (updateSalesAgent) {
      return res.status(201).json(updateSalesAgent);
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to update email.",
      errorMessage: error.message,
    });
  }
})

app.post("/agents", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: "Invalid input: 'email' must be a valid email address.",
      });
    }

    const existingAgent = await salesAgent.findOne({ email: email });
    if (existingAgent) {
      return res.status(409).json({
        error: `Sales agent with email ${email} already exists.`,
      });
    }
    const savedSalesAgent = await createNewSalesAgent(req.body);
    if (savedSalesAgent) {
      return res.status(201).json(savedSalesAgent);
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to add sales agent.",
      errorMessage: error.message,
    });
  }
});



async function readAllSalesAgents() {
  try {
    const allSalesAgents = await salesAgent.find();
    return allSalesAgents;
  } catch (error) {
    throw error;
  }
}

app.get("/agents", async (req, res) => {
  try {
    const allSalesAgents = await readAllSalesAgents();
    if (allSalesAgents.length != 0) {
      res.json(allSalesAgents);
    } else {
      res.status(404).json({ error: "Sales agents not found" });
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to get sales agents details.",
      errorMessage: error.message,
    });
  }
});

async function deleteAgentById(agentId){
  try{
    const selectedAgent = await salesAgent.findByIdAndDelete(agentId)
    return selectedAgent
  }catch(error){
    throw error
  }
}

app.delete("/agents/:id", async(req, res) => {
   try {
    const existingAgent = await salesAgent.findById(req.params.id);
    if (!existingAgent) {
      return res.status(404).json({
        error: `Agent with ID '${req.params.id}' not found.`,
      });
    }
    const deletedAgent = await deleteAgentById(req.params.id);
    if (deletedAgent) {
      res.status(201).json({ message: "Agent deleted successfully." });
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete the Agent",
      errorMessage: error.message,
    });
  }
})

async function createNewLeads(newLeadDetails) {
  try {
    const newLead = new lead(newLeadDetails);
    const saveNewLead = await newLead.save();
    return saveNewLead;
  } catch (error) {
    throw error;
  }
}

app.post("/leads", async (req, res) => {
  try {
    const requiredFields = [
      "name",
      "source",
      "salesAgent",
      "status",
      "timeToClose",
      "priority",
    ];
    const missingFields = requiredFields.filter((field) => {
      const value = req.body[field];

      if (value === undefined || value === null) return true;

      if (typeof value === "string") {
        return value.trim() === "";
      }
      return false;
    });
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Invalid Input: ${missingFields.join(", ")} is required`,
      });
    }
    const agentId = req.body.salesAgent;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(409).json({ error: "Invalid Sales Agent ID format." });
    }

    const existingSalesAgent = await salesAgent.findById(agentId);

    if (!existingSalesAgent) {
      return res.status(404).json({
        error: `Sales agent with ID ${agentId} not found.`,
      });
    }

    const newLead = await createNewLeads(req.body);
    if (newLead) {
      await newLead.populate("salesAgent", "name");
      res.status(201).json(newLead);
    } else {
      res.status(400).json({ error: "Lead could not be created." });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to add new leads", errorMessage: error.message });
  }
});

async function getAllLeads(filter) {
  try {
    const allLeads = await lead.find(filter);
    return allLeads;
  } catch (error) {
    throw error;
  }
}

app.get("/leads", async (req, res) => {
  try {
    const { salesAgent, status, source, tags } = req.query;
    const filter = {};

    const allowedStatus = [
      "New",
      "Contacted",
      "Qualified",
      "Proposal Sent",
      "Closed",
    ];
    const allowedSource = [
      "Website",
      "Referral",
      "Cold Call",
      "Advertisement",
      "Email",
      "Other",
    ];

    if (salesAgent) {
      if (!mongoose.Types.ObjectId.isValid(salesAgent)) {
        return res
          .status(400)
          .json({ error: "Invalid Sales Agent ID format." });
      }
      filter.salesAgent = salesAgent;
    }

    if (status) {
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({
          error: `Invalid input: 'status' must be one of ['${allowedStatus.join("', '")}].`,
        });
      }
      filter.status = status;
    }

    if (source) {
      if (!allowedSource.includes(source)) {
        return res.status(400).json({
          error: `Invalid input: 'source' must be one of ['${allowedSource.join(", ")}].`,
        });
      }
      filter.source = source;
    }

    if (tags) {
      filter.tags = tags;
    }

    const allLeads = await getAllLeads(filter);
    if (allLeads.length > 0) {
      await lead.populate(allLeads, { path: "salesAgent", select: "name" });
      res.status(200).json(allLeads);
    } else {
      res
        .status(404)
        .json({ message: "No leads found matching these criteria." });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get the leads", errorMessage: error.message });
  }
});

async function updateLeadById(leadId, dataToUpdate) {
  try {
    const updateLead = await lead.findByIdAndUpdate(
      { _id: leadId },
      dataToUpdate,
      { new: true },
    );
    return updateLead;
  } catch (error) {
    throw error;
  }
}

app.post("/leads/:id", async (req, res) => {
  try {
    const requiredFields = [
      "name",
      "source",
      "salesAgent",
      "status",
      "timeToClose",
      "priority",
    ];
    const missingFields = requiredFields.filter((field) => {
      const value = req.body[field];

      if (value === undefined || value === null) return true;

      if (typeof value === "string") {
        return value.trim() === "";
      }
      return false;
    });
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Invalid Input: ${missingFields.join(", ")} is required`,
      });
    }
    const agentId = req.body.salesAgent;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(409).json({ error: "Invalid Sales Agent ID format." });
    }

    const existingSalesAgent = await salesAgent.findById(agentId);

    if (!existingSalesAgent) {
      return res.status(404).json({
        error: `Sales agent with ID '${agentId}' not found.`,
      });
    }

    const existingLead = await lead.findById(req.params.id);

    if (!existingLead) {
      return res.status(404).json({
        error: `Lead with ID '${req.params.id}' not found.`,
      });
    }

    const newLead = await updateLeadById(req.params.id, req.body);
    if (newLead) {
      await newLead.populate("salesAgent", "name");
      res.status(201).json(newLead);
    } else {
      res.status(400).json({ error: "Lead could not be created." });
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to update the leads",
      errorMessage: error.message,
    });
  }
});

async function deleteLeadById(leadId) {
  try {
    const deleteLead = await lead.findByIdAndDelete(leadId);
    return deleteLead;
  } catch (error) {
    throw error;
  }
}

app.delete("/leads/:id", async (req, res) => {
  try {
    const existingLead = await lead.findById(req.params.id);
    if (!existingLead) {
      return res.status(404).json({
        error: `Lead with ID '${req.params.id}' not found.`,
      });
    }
    const deletedLead = await deleteLeadById(req.params.id);
    if (deletedLead) {
      res.status(201).json({ message: "Lead deleted successfully." });
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete the lead",
      errorMessage: error.message,
    });
  }
});

async function createNewComments(commentData) {
  try {
    const newComment = new comment(commentData);
    const saveNewComment = await newComment.save();
    return saveNewComment;
  } catch (error) {
    throw error;
  }
}

app.post("/leads/:id/comments", async (req, res) => {
  try {
    const leadId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({ error: "Invalid Lead ID format." });
    }

    const existingLead = await lead.findById(leadId);
    if (!existingLead) {
      return res
        .status(404)
        .json({ error: `Lead with ID '${leadId}' not found.` });
    }

    const { commentText , author } = req.body;
    if (!commentText || typeof commentText !== "string") {
      return res
        .status(400)
        .json({ error: "commentText is required and must be a string." });
    }
    const existingAgent = await salesAgent.findById(author)
    if (!existingAgent) {
      return res
        .status(409)
        .json({ error: `Sales Agent with ID '${author}' not found.` });
    }
    const commentData = {
      lead: leadId,
      commentText: commentText,
      author: author,
    };

    const newComment = await createNewComments(commentData);

    if (newComment) {
      await newComment.populate("author", "name");
      const commentObj = newComment.toObject();
      commentObj.author = commentObj.author?.name || "Unknown Author";
      return res.status(201).json(commentObj);
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to add new comments",
      errorMessage: error.message,
    });
  }
});

async function getAllComments(filter) {
  try {
    const allComments = await comment.find(filter);
    return allComments;
  } catch (error) {
    throw error;
  }
}

app.get("/leads/:id/comments", async (req, res) => {
  try {
    const leadId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({ error: "Invalid Lead ID format." });
    }

    const existingLead = await lead.findById(leadId);
    if (!existingLead) {
      return res
        .status(404)
        .json({ error: `Lead with ID '${leadId}' not found.` });
    }

    const filter = { lead: leadId };

    const allComments = await getAllComments(filter);
    if (allComments.length > 0) {
      await comment.populate(allComments, {
        path: "author",
        select: "name",
      });

      const formattedComments = allComments.map((commentDoc) => {
        const commentObj = commentDoc.toObject();
        return {
          ...commentObj,
          author: commentObj.author?.name || "Unknown Author",
        };
      });

      return res.status(200).json(formattedComments);
    } else {
      res.status(404).json({ error: "No comment found" });
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to get all comments",
      errorMessage: error.message,
    });
  }
});

async function getLastWeekReports() {
  try {
    const now = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(now.getDate() - 7);
    const filter = {
      status: "Closed",
      createdAt: { $gte: lastWeek },
    };

    const leads = await lead.find(filter);
    return leads;
  } catch (error) {
    throw error
  }
}

app.get("/report/last-week", async (req, res) => {
  try{
    const leads = await getLastWeekReports()
    if(leads.length > 0 ){
      res.status(201).json(leads)
    }else{
      res.status(404).json({error: "No leads found"})
    }
  }catch(error){
     res.status(500).json({
      error: "Failed to last week leads",
      errorMessage: error.message,
    });
  }
})

async function readAllLeads(){
  try{
    const allLeads = await lead.find({ status: { $ne: "closed" } })
    return allLeads
  }catch(error){
    throw error
  }
}

app.get("/report/pipeline", async (req, res) => {
  try{
    const allLeads = await readAllLeads()
    if(allLeads.length > 0 ){
      res.status(201).json({
  "totalLeadsInPipeline": allLeads.length
})
    }else{
      res.status(404).json({error: "No leads found"})
    }
  }catch(error){
     res.status(500).json({
      error: "Failed to fetch all leads",
      errorMessage: error.message,
    });
  }
})

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on the PORT", PORT);
});
