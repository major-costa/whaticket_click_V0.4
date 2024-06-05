import React, { useState, useEffect, useReducer, useContext, useRef } from "react";

import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { CSVLink } from "react-csv";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Avatar from "@material-ui/core/Avatar";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";

import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";

import ImportIcon from '@material-ui/icons/GetApp';
import DeleteForever from '@material-ui/icons/DeleteForeverOutlined';
import AddBoxOutlinedIcon from '@material-ui/icons/AddBoxOutlined';
import ExportIcon from '@material-ui/icons/ImportExport';

import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal/";

import { i18n } from "../../translate/i18n";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import NewTicketModal from "../../components/NewTicketModal";
import { socketConnection } from "../../services/socket";
import { Tooltip } from "@material-ui/core";

import { withStyles } from '@material-ui/core/styles';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

import ContactPhoneIcon from '@material-ui/icons/ContactPhone';
import CreateNewFolderIcon from '@material-ui/icons/CreateNewFolder';
import GetAppIcon from '@material-ui/icons/GetApp';

import useTickets from "../../hooks/useTickets";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; 
import { faHeadset } from '@fortawesome/free-solid-svg-icons';

const reducer = (state, action) => {


  if (action.type === "LOAD_CONTACTS") {
    const contacts = action.payload;
    const newContacts = [];

    contacts.forEach((contact) => {
      const contactIndex = state.findIndex((c) => c.id === contact.id);
      if (contactIndex !== -1) {
        state[contactIndex] = contact;
      } else {
        newContacts.push(contact);
      }
    });

    return [...state, ...newContacts];
  }

  if (action.type === "UPDATE_CONTACTS") {
    const contact = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contact.id);

    if (contactIndex !== -1) {
      state[contactIndex] = contact;
      return [...state];
    } else {
      return [contact, ...state];
    }
  }

  if (action.type === "DELETE_CONTACT") {
    const contactId = action.payload;

    const contactIndex = state.findIndex((c) => c.id === contactId);
    if (contactIndex !== -1) {
      state.splice(contactIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  CSVLink:{
    color: "white"
  },
  iconButton:{
    paddingRight: 0,
  },

  emAtendimento: {
    animation: "$blink 1.5s infinite",
  },
  "@keyframes blink": {
    "0%": { opacity: 1 },
    "50%": { opacity: 0 },
    "100%": { opacity: 1 },
  },

}));

const Contacts = () => {

  const fileUploadRef = useRef(null);
  const [ImportContacts, setImportContacts] = useState(null);

  const handleImportExcel = async () => {
      try {
          const formData = new FormData();
          formData.append("file", fileUploadRef.current.files[0]);
          await api.request({
              url: `/contacts/upload`,
              method: "POST",
              data: formData,
          });
          history.go(0);
      } catch (err) {
          toastError(err);
      }
  }; 

  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const { tickets } = useTickets({
    pageNumber: 1,
    status: "open",
    showAll:"true",
  });

  const StyledMenu = withStyles({
    paper: {
      border: '1px solid #d3d4d5',
    },
  })((props) => (
    <Menu
      elevation={0}
      getContentAnchorEl={null}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      {...props}
    />
  ));

  const StyledMenuItem = withStyles((theme) => ({
    root: {
      '&:focus': {
        backgroundColor: theme.palette.primary.main,
        '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
          color: theme.palette.common.white,
        },
      },
    },
  }))(MenuItem);

  const classes = useStyles();
  const history = useHistory();

  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [contacts, dispatch] = useReducer(reducer, []);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [contactTicket, setContactTicket] = useState({});
  const [deletingContact, setDeletingContact] = useState(null);
  const [deletingAllContact, setDeletingAllContact] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [TodosTickets, setTodosTickets] = useState([]);

  useEffect(() => {
    setTodosTickets(tickets);
  }, [tickets]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("/contacts/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketConnection({ companyId });

    socket.on(`company-${companyId}-contact`, (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  // const handleSaveTicket = async contactId => {
  //    if (!contactId) return;
  //    setLoading(true);
  //    try {
  //        const { data: ticket } = await api.post("/tickets", {
  //            contactId: contactId,
  //            userId: user?.id,
  //            status: "open",
  //        });
  //        history.push(`/tickets/${ticket.id}`);
  //    } catch (err) {
  //        toastError(err);
  //    }
  //    setLoading(false);
  // };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const hadleEditContact = (contactId) => {
    setSelectedContactId(contactId);
    setContactModalOpen(true);
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await api.delete(`/contacts/${contactId}`);
      toast.success(i18n.t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleDeleteAllContact = async () => {
    try {
      await api.delete("/contacts");
      toast.success(i18n.t("contacts.toasts.deletedAll"));
      history.go(0);
    } catch (err) {
      toastError(err);
    }
    setDeletingAllContact(null);
    setSearchParam("");
    setPageNumber();
  };

  const handleimportContact = async () => {
    try {
      await api.post("/contacts/import");
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };


  return (
    <MainContainer className={classes.mainContainer}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        initialContact={contactTicket}
        onClose={(ticket) => {
          handleCloseOrOpenTicket(ticket);
        }}
      />
      <ContactModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        aria-labelledby="form-dialog-title"
        contactId={selectedContactId}
      ></ContactModal>
      <ConfirmationModal
        title={
          deletingContact
            ? `${i18n.t(
                "contacts.confirmationModal.deleteTitle"
            )} ${deletingContact.name}?`
            : ImportContacts
              ? `${i18n.t("contacts.confirmationModal.importTitlte")}`
              : `${i18n.t(
                  "contactListItems.confirmationModal.importTitlte"
              )}`
        }
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={(e) =>
          deletingContact
            ? handleDeleteContact(deletingContact.id)
            : ImportContacts
              ? handleimportContact()
                : handleImportExcel()
        }
      >
        {deletingContact
          ? `${i18n.t("contacts.confirmationModal.deleteMessage")}`
          : ImportContacts
            ? `${i18n.t("contacts.confirmationModal.importMessage")}`
            : `${i18n.t(
                "contactListItems.confirmationModal.importMessage"
            )}`}
      </ConfirmationModal>




      <MainHeader>
        <Title>{i18n.t("contacts.title")}</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("contacts.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              ),
            }}
          />
          
          <Button aria-controls="customized-menu" aria-haspopup="true" variant="contained" color="primary" onClick={handleClick}>
            
            <GetAppIcon 
              className={classes.iconButton}
            />

          </Button>

          <StyledMenu id="customized-menu" anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleClose}>
            
            <StyledMenuItem onClick={(e) => setConfirmOpen(true)}>
              <ListItemIcon>
                <ContactPhoneIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Importar Agenda" />
            </StyledMenuItem>


            <StyledMenuItem onClick={() => {fileUploadRef.current.value = null;fileUploadRef.current.click();}}>
              <ListItemIcon>
                <CreateNewFolderIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Importar Excel" />
            </StyledMenuItem>

          </StyledMenu>

          <Tooltip title={i18n.t("contacts.buttons.add")}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenContactModal}
            >
            <AddBoxOutlinedIcon 
              className={classes.iconButton}
            />
            </Button>
          </Tooltip>

          <Tooltip title={i18n.t("contacts.buttons.export")}>
          <CSVLink style={{ textDecoration:'none'}} separator=";" filename={'contatos.csv'} data={contacts.map((contact) => ({ name: contact.name, number: contact.number, email: contact.email }))}>
              <Button
              variant="contained"
              color="primary"
              >                
              <ExportIcon 
              className={classes.iconButton}
              />             
              </Button>
            </CSVLink>
            </Tooltip>

          <Can
            role={user.profile}
            perform="drawer-admin-items:view"
            yes={() => (
              <>
                <Tooltip title={i18n.t("contacts.buttons.delete")}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={(e) => {
                      setConfirmOpen(true);
                      setDeletingAllContact(contacts);
                    }}
                  >
                    <DeleteForever
                    className={classes.iconButton}
                    />
                  </Button>
                </Tooltip>
                </>
            )}
          />

        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >

      <>
        <input
            style={{ display: "none" }}
            id="upload"
            name="file"
            type="file"
            accept=".xls,.xlsx"
            onChange={() => {
                setConfirmOpen(true);
            }}
            ref={fileUploadRef}
        />
      </>
      
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>{i18n.t("contacts.table.name")}</TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.whatsapp")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.email")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  
                  <TableCell style={{ paddingRight: 0, textAlign: "end"}}>
                    
                    {(() => {
                      var emAtendimento = <FontAwesomeIcon className={classes.emAtendimento} color="green" icon={faHeadset} />;  
                      for (let i = 0; i < TodosTickets.length; i++) {
                        if (TodosTickets[i].contact.number === contact.number) {
                          return emAtendimento
                        }
                      }
                    })()}<Avatar src={contact.profilePicUrl} />

                  </TableCell>
                  
                  <TableCell>
                
                    {contact.name}

                  </TableCell>

                  <TableCell align="center">{user.isTricked === "enabled"? contact.number : contact.number}</TableCell>
                  <TableCell align="center">{contact.email}</TableCell>
                  <TableCell align="center">

                    <IconButton
                      size="small"
                      onClick={() => {
                        setContactTicket(contact);
                        setNewTicketModalOpen(true);
                      }}
                    >
                      <WhatsAppIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => hadleEditContact(contact.id)}
                    >
                      <EditIcon />
                    </IconButton>
                    <Can
                      role={user.profile}
                      perform="contacts-page:deleteContact"
                      yes={() => (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setConfirmOpen(true);
                            setDeletingContact(contact);
                          }}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton avatar columns={3} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Contacts;
