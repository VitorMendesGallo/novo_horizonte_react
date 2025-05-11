import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/alunos.css";
// importar icons
import EditIcon from "../../common/icons/EditIcon";
import TrashIcon from "../../common/icons/TrashIcon";
import SetaCima from "../../common/icons/SetaCima";
import SetaBaixo from "../../common/icons/SetaBaixo";
import LupaIcon from "../../common/icons/LupaIcon";
// importar csv e pdf
import BotaoExportarCsv from "../../common/buttons/botaoExportarCsv";
import BotaoExportarPdf from "../../common/buttons/botaoExportarPdf";

const StudentCard = () => {
	const [alunos, setAlunos] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [allData, setAllData] = useState([]);
	const [openDropdowns, setOpenDropdowns] = useState({});
	const navigate = useNavigate();

	const toggleDropdown = (id) => {
		setOpenDropdowns((prev) => ({
			...prev,
			[id]: !prev[id],
		}));
	};

	const deleteStudent = async (id) => {
		try {
			const palavraChave = "GOLDEN FREDDY";
			const resposta = window.prompt(
				`Digite "${palavraChave}" para confirmar a exclusão do aluno:`
			);
			if (resposta === null || resposta !== palavraChave) {
				alert("Ação cancelada. Confirmação inválida.");
				return;
			}

			await axios.delete(`http://localhost:8080/alunos/${id}`);
			axios.delete(`http://localhost:8080/maes/${id}`);
			axios.delete(`http://localhost:8080/pais/${id}`);
			axios.delete(`http://localhost:8080/observacoes/${id}`);
			setAlunos((prevAlunos) => prevAlunos.filter((aluno) => aluno.id !== id));
			setAllData((prevAllData) =>
				prevAllData.filter((aluno) => aluno.id !== id)
			);
		} catch (err) {
			console.error("Erro ao deletar aluno:", err);
			setError("Erro ao deletar aluno");
		}
	};

	// Carrega dados iniciais
	useEffect(() => {
		const fetchInitialData = async () => {
			try {
				const [alunosRes, maesRes, paisRes, observacoesRes] = await Promise.all(
					[
						axios.get("http://localhost:8080/alunos"),
						axios.get("http://localhost:8080/maes"),
						axios.get("http://localhost:8080/pais"),
						axios.get("http://localhost:8080/observacoes"),
					]
				);

				const alunosData = alunosRes.data.map((aluno) => {
					const mae = maesRes.data.find((m) => m.idMae === aluno.id) || {};
					const pai = paisRes.data.find((p) => p.idPai === aluno.id) || {};
					const obs =
						observacoesRes.data.find((o) => o.idObservacoes === aluno.id) || {};

					return {
						...aluno,
						nomeMae: mae.nomeMae,
						nascimentoMae: mae.nascimentoMae,
						enderecoMae: mae.enderecoMae,
						numeroCasaMae: mae.numeroCasaMae,
						cepMae: mae.cepMae,
						cpfMae: mae.cpfMae,
						rgMae: mae.rgMae,
						telefoneMae: mae.telefoneMae,
						emailMae: mae.emailMae,
						profissaoMae: mae.profissaoMae,
						trabalhoMae: mae.trabalhoMae,
						telefoneTrabalhoMae: mae.telefoneTrabalhoMae,
						nomePai: pai.nomePai,
						nascimentoPai: pai.nascimentoPai,
						numeroCasaPai: pai.numeroCasaPai,
						enderecoPai: pai.enderecoPai,
						cepPai: pai.cepPai,
						cpfPai: pai.cpfPai,
						rgPai: pai.rgPai,
						telefonePai: pai.telefonePai,
						emailPai: pai.emailPai,
						profissaoPai: pai.profissaoPai,
						trabalhoPai: pai.trabalhoPai,
						telefoneTrabalhoPai: pai.telefoneTrabalhoPai,
						...obs,
					};
				});

				setAllData(alunosData);
				setAlunos(alunosData);
			} catch (err) {
				setError("Erro ao carregar dados iniciais");
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		fetchInitialData();
	}, []);

	// Busca dinâmica
	useEffect(() => {
		const controller = new AbortController();

		const fetchData = async () => {
			try {
				if (!searchTerm.trim()) {
					setAlunos(allData);
					return;
				}

				// Faz todas as requisições em paralelo
				const [alunosPorNome, maesPorNome, paisPorNome, alunosPorCpf] =
					await Promise.all([
						axios.get(
							`http://localhost:8080/alunos/buscarPorNome?nome=${searchTerm}`,
							{
								signal: controller.signal,
							}
						),
						axios.get(
							`http://localhost:8080/maes/buscarPorNome?nomeMae=${searchTerm}`,
							{
								signal: controller.signal,
							}
						),
						axios.get(
							`http://localhost:8080/pais/buscarPorNome?nomePai=${searchTerm}`,
							{
								signal: controller.signal,
							}
						),
						axios.get(
							`http://localhost:8080/alunos/buscarPorCpf?cpf=${searchTerm}`,
							{
								signal: controller.signal,
							}
						),
					]);

				// Coleta todos os IDs relevantes
				const alunoIds = new Set();

				// 1. Alunos por nome
				alunosPorNome.data.forEach((aluno) => alunoIds.add(aluno.id));

				// 2. Mães encontradas -> busca alunos relacionados
				maesPorNome.data.forEach((mae) => {
					const alunosDaMae = allData.filter((aluno) => aluno.id === mae.idMae);
					alunosDaMae.forEach((aluno) => alunoIds.add(aluno.id));
				});

				// 3. Pais encontrados -> busca alunos relacionados
				paisPorNome.data.forEach((pai) => {
					const alunosDoPai = allData.filter((aluno) => aluno.id === pai.idPai);
					alunosDoPai.forEach((aluno) => alunoIds.add(aluno.id));
				});

				// 4. Alunos por CPF
				alunosPorCpf.data.forEach((aluno) => alunoIds.add(aluno.id));

				// Filtra alunos com base nos IDs coletados
				const resultados = Array.from(alunoIds)
					.map((id) => allData.find((aluno) => aluno.id === id))
					.filter(Boolean);

				setAlunos(resultados);
			} catch (error) {
				if (!axios.isCancel(error)) {
					console.error("Erro na busca:", error);
					setError("Erro ao realizar busca");
				}
			}
		};

		const debounceTimer = setTimeout(fetchData, 300);
		return () => {
			controller.abort();
			clearTimeout(debounceTimer);
		};
	}, [searchTerm, allData]);

	if (loading) return <p>Carregando...</p>;
	if (error) return <p className='text-danger'>{error}</p>;

	// Adicionar CSS condicional para os cartões
	const getCardClass = (isOpen) => {
		return `student-card ${isOpen ? "expanded" : ""}`;
	};

	return (
		<div className='student-container'>
			<div className='search-input'>
				<input
					type='text'
					placeholder='Buscar por CPF, nome, pai ou mãe...'
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
				/>
				<LupaIcon />
			</div>

			{loading ? (
				<div className='loading-text'>
					<p>Carregando dados dos alunos...</p>
					<div className='spinner'></div>
				</div>
			) : error ? (
				<div className='error-message'>{error}</div>
			) : (
				<div className='student-grid'>
					{alunos.map((aluno) => (
						<div
							className={getCardClass(openDropdowns[aluno?.id])}
							key={aluno?.id}
						>
							<div className='card-cabecalho'>
								<h2
									className='card-title'
									title={aluno?.nome || "Nome não cadastrado"}
								>
									{aluno?.nome || "Nome não cadastrado"}
								</h2>
								<div className='card-actions'>
									<button
										className='dropdown-alternar'
										onClick={() => toggleDropdown(aluno?.id)}
									>
										{openDropdowns[aluno?.id] ? <SetaBaixo /> : <SetaCima />}
									</button>
									<button
										className='edit-button'
										onClick={() => navigate(`/editar/${aluno?.id}`)}
									>
										<EditIcon />
									</button>
									<button
										className='delete-button'
										onClick={() => deleteStudent(aluno?.id)}
									>
										<TrashIcon />
									</button>
								</div>
							</div>

							{openDropdowns[aluno?.id] && (
								<div className='card-corpo'>
									<div className='info-item'>
										<strong>Sexo: </strong>
										{aluno?.sexo || "Não informado"}
									</div>
									<div className='info-item'>
										<strong>CPF: </strong>
										{aluno?.cpf || "Não informado"}
									</div>
									<div className='info-item'>
										<strong>RG: </strong>
										{aluno?.rg || "Não informado"}
									</div>
									<div className='info-item'>
										<strong>Ano Letivo: </strong>
										{aluno?.anoLetivo || "Não informado"}
									</div>
									<div className='info-item'>
										<strong>Turno: </strong>
										{aluno?.turno || "Não informado"}
									</div>
									<div className='info-item'>
										<strong>Tipo Sanguíneo: </strong>
										{aluno?.tipoSanguineo || "Não informado"}
									</div>

									<div className='section'>
										<h3 className='section-title'>Responsável Materno</h3>
										<div className='info-item'>
											<strong>Nome: </strong>
											{aluno?.nomeMae || "Não informado"}
										</div>
										<div className='info-item'>
											<strong>Endereço: </strong>
											{aluno?.enderecoMae || "Não informado"}
										</div>
										<div className='info-item'>
											<strong>Número da Casa: </strong>
											{aluno?.numeroCasaMae || "Não informado"}
										</div>
										<div className='info-item'>
											<strong>Telefone: </strong>
											{aluno?.telefoneMae || "Não informado"}
										</div>
										<div className='info-item'>
											<strong>Trabalho: </strong>
											{aluno?.trabalhoMae || "Não informado"}
										</div>
										<div className='info-item'>
											<strong>Telefone do Trabalho: </strong>
											{aluno?.telefoneTrabalhoMae || "Não informado"}
										</div>
									</div>

									<div className='section'>
										<h3 className='section-title'>Responsável Paterno</h3>
										<div className='info-item'>
											<strong>Nome: </strong>
											{aluno?.nomePai || "Não informado"}
										</div>
										<div className='info-item'>
											<strong>Endereço: </strong>
											{aluno?.enderecoPai || "Não informado"}
										</div>

										<div className='info-item'>
											<strong>Número da Casa: </strong>
											{aluno?.numeroCasaPai || "Não informado"}
										</div>

										<div className='info-item'>
											<strong>Telefone: </strong>
											{aluno?.telefonePai || "Não informado"}
										</div>
										<div className='info-item'>
											<strong>Trabalho: </strong>
											{aluno?.trabalhoPai || "Não informado"}
										</div>
										<div className='info-item'>
											<strong>Telefone do Trabalho: </strong>
											{aluno?.telefoneTrabalhoPai || "Não informado"}
										</div>
									</div>

									<div className='section'>
										<h3 className='section-title'>Observações</h3>
										<div className='section'>
											<h5 className='section-title sub-title'>
												Informações Médicas
											</h5>

											<div className='info-item'>
												<strong>Especialista: </strong>
												{aluno?.especialista || "Não informado"}
											</div>

											<div className='info-item'>
												<strong>Alergia: </strong>
												{aluno?.alergia || "Não informado"}
											</div>

											<div className='info-item'>
												<strong>Medicamento: </strong>
												{aluno?.medicamento || "Não informado"}
											</div>
										</div>

										<div className='section'>
											<h5 className='section-title sub-title'>
												Responsável Financeiro
											</h5>

											<div className='info-item'>
												<strong>Nome: </strong>
												{aluno?.respNome || "Não informado"}
											</div>
											<div className='info-item'>
												<strong>Telefone: </strong>
												{aluno?.respTelefone || "Não informado"}
											</div>
										</div>

										<div className='section'>
											<h5 className='section-title sub-title'>
												Pessoas Autorizadas
											</h5>
											<div className='info-item'>
												<strong>Pessoas: </strong>
												{aluno?.pessoasAutorizadas ||
													"Nenhuma pessoa autorizada"}
											</div>
										</div>
									</div>
									<div className='d-flex justify-around'>
										<BotaoExportarPdf student={aluno} />
										<BotaoExportarCsv student={aluno} />
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default StudentCard;
